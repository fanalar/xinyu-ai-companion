"""HTTPS Date clock with a bounded monotonic lifetime; never change system time."""
import threading
import time
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
import httpx

CHINA_TIME = timezone(timedelta(hours=8))
_anchor = None
_lock = threading.Lock()
ENDPOINTS = ('https://www.chinanews.com.cn/rss/importnews.xml', 'https://www.ithome.com/rss/')

def observe(headers, source):
    global _anchor
    try:
        stamp = parsedate_to_datetime(headers.get('date', '')).timestamp()
        # Cached HTTP responses do not establish current time.
        if headers.get('age', '0') != '0' or not 1577836800 < stamp < 4102444800:
            return
        with _lock:
            _anchor = (stamp, time.monotonic(), source)
    except (ValueError, TypeError, OverflowError):
        pass

def current(cancel):
    global _anchor
    if cancel.is_set():
        raise InterruptedError()
    with _lock:
        fresh = _anchor and time.monotonic() - _anchor[1] < 300
    if not fresh:
        for endpoint in ENDPOINTS:
            if cancel.is_set(): raise InterruptedError()
            try:
                with httpx.Client(timeout=httpx.Timeout(5, connect=3), follow_redirects=False) as client:
                    with client.stream('GET', endpoint, headers={'Cache-Control': 'no-cache'}) as response:
                        response.raise_for_status()
                        observe(response.headers, endpoint)
                with _lock:
                    if _anchor and time.monotonic()-_anchor[1] < 300: break
            except httpx.HTTPError:
                pass
    if cancel.is_set(): raise InterruptedError()
    with _lock:
        anchor = _anchor
    verified = bool(anchor and time.monotonic()-anchor[1] < 300)
    stamp = anchor[0] + time.monotonic()-anchor[1] if verified else time.time()
    return {'now_ms': int(stamp*1000), 'verified': verified,
            'source': anchor[2] if verified else '电脑系统时间',
            'device_skew_ms': int((stamp-time.time())*1000)}

def is_date_query(text):
    return not re_search(r'新闻|资讯|天气|提醒|生日|纪念|约会', text) and bool(re_search(
        r'今天.*(日期|几号|几月|星期|周几|农历)|现在.*(时间|几点|日期)|明天.*(几号|星期|周几)|后天.*(几号|星期|周几)|^(日期|时间|几点了|今天几号|今天星期几)[？?。！!]*$', text.strip()))

def re_search(pattern, text):
    import re
    return re.search(pattern, text)

def reply(text, cancel):
    import news_bulletin
    clock = current(cancel)
    now = datetime.fromtimestamp(clock['now_ms']/1000, CHINA_TIME)
    offset = 2 if '后天' in text else 1 if '明天' in text else 0
    date = now + timedelta(days=offset)
    lunar = news_bulletin.lunar_date(date.date(), cancel)
    label = ('今天','明天','后天')[offset]
    message = f'{label}是{date.year}年{date.month}月{date.day}日，星期{"一二三四五六日"[date.weekday()]}' + ('，农历'+lunar if lunar else '') + '。'
    if not offset: message += f'现在是北京时间{now:%H:%M}。'
    message += '\n时间已通过联网核对。' if clock['verified'] else '\n联网核时未成功，以上依据电脑系统时间，请检查自动日期和时间。'
    return {'kind':'date','status':'ok' if clock['verified'] else 'partial','reply':message,
            'sources':[],'clock':clock,'checked_at':now.isoformat()}
