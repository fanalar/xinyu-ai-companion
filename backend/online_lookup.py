"""Public information lookup for personal beta. Never fetch a URL from user/feed text."""
import html
import ipaddress
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit, urlencode
import httpx
import public_clock

WEATHER = re.compile(r'天气|气温|下雨|降雨|weather', re.I)
NEWS = re.compile(r'新闻|资讯|头条|早报|晚报|简报|news', re.I)
SEARCH = re.compile(r'联网|上网|搜索|搜一下|查一下|查查|帮我查|查一查|查询')

def intent(text):
    if re.search(r'不(要|用|想|需要)(联网|上网|查|搜索|新闻|资讯)', text): return None
    if WEATHER.search(text): return 'weather'
    if public_clock.is_date_query(text):return 'date'
    if re.search(r'github|开源项目|B站|哔哩哔哩|v2ex',text,re.I):return 'search'
    if re.search(r'https://',text) and re.search(r'读|阅读|看看|看一下|总结|介绍',text):return 'search'
    if NEWS.search(text) and (SEARCH.search(text) or re.search(r'今天|今日|昨天|明天|最近|最新|近一周|这周|查|有什么|有哪些|播报|讲讲|读|念|看一下|想听|听听|说说|介绍|\d{1,2}月\d{1,2}',text) or len(text.strip('？?。')) <= 8): return 'news'
    if SEARCH.search(text): return 'search'
    return None

def safe_link(url):
    try:
        u = urlsplit(url)
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password: return ''
        host = u.hostname.lower()
        if host == 'localhost' or '.' not in host: return ''
        try:
            if not ipaddress.ip_address(host).is_global: return ''
        except ValueError: pass
        return url
    except ValueError: return ''

def clean(text, size=240):
    return html.unescape(re.sub(r'<[^>]*>', '', text or '')).strip()[:size]

def get(url, params, cancel):
    if cancel.is_set(): raise InterruptedError()
    # Only fixed provider endpoints are passed here. No redirects to unknown hosts.
    with httpx.Client(timeout=httpx.Timeout(10, connect=5), follow_redirects=False) as client:
        with client.stream('GET', url, params=params, headers={'User-Agent':'XinyuPersonalBeta/1.1.1'}) as r:
            r.raise_for_status()
            public_clock.observe(r.headers,url)
            chunks=[]; size=0
            for chunk in r.iter_bytes():
                if cancel.is_set(): raise InterruptedError()
                size += len(chunk)
                if size > 2_000_000: raise ValueError('response too large')
                chunks.append(chunk)
    return b''.join(chunks)

def json_get(url, params, cancel):
    import json
    return json.loads(get(url, params, cancel))

def rss(url, params, cancel, label, recent=False):
    raw=get(url, params, cancel)
    if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper(): raise ValueError('unsafe XML')
    root=ET.fromstring(raw)
    out=[]
    atom={'a':'http://www.w3.org/2005/Atom'}
    nodes=root.findall('.//item') or root.findall('.//a:entry',atom)
    for item in nodes[:100]:
        if item.tag.endswith('entry'):
            link_node=item.find('a:link',atom)
            title=clean(item.findtext('a:title',namespaces=atom),160)
            link=safe_link(link_node.get('href','') if link_node is not None else '')
            published=None
            try:published=datetime.fromisoformat((item.findtext('a:published',namespaces=atom) or '').replace('Z','+00:00')).isoformat()
            except ValueError:pass
            if title and link:out.append({'title':title,'url':link,'publisher':label or urlsplit(link).hostname,'published_at':published,'snippet':clean(item.findtext('a:summary',namespaces=atom),160)})
            continue
        link=safe_link(item.findtext('link') or '')
        title=clean(item.findtext('title'),160)
        if not link or not title: continue
        published=None
        try:
            date=parsedate_to_datetime(item.findtext('pubDate') or '')
            if date.tzinfo is None: date=date.replace(tzinfo=timezone.utc)
            if recent and not timedelta(minutes=-10) <= datetime.now(timezone.utc)-date <= timedelta(days=3): continue
            published=date.isoformat()
        except (ValueError,TypeError,OverflowError):
            if recent: continue
        out.append({'title':title,'url':link,'publisher':label or urlsplit(link).hostname,'published_at':published,'snippet':clean(item.findtext('description'),160)})
    return out

def city_of(text):
    value=re.split(r'天气|气温|下雨|降雨|weather',text,flags=re.I)[0]
    value=re.sub(r'^(请|麻烦|能不能|可以|帮我|给我|我想|想知道|查询|查一下|查一查|查查|看看|查|问一下|联网|搜索|上网|一下)+','',value)
    value=re.sub(r'今天|明天|后天|现在|未来[一二三四五六七\d]+天|这周|一周|周末|的|是否|会不会|会|怎么样|如何|怎样|有多冷|有多热','',value)
    return value.strip(' ，,。？?！!：:')[:60]

def weather(text, cancel, city=''):
    place=city_of(text) or city
    if not place:
        return {'reply':'你想查哪个城市的天气？例如“北京明天天气”。我不会自动获取你的位置。','status':'clarification','pending_weather':True,'sources':[]}
    locations=json_get('https://geocoding-api.open-meteo.com/v1/search',{'name':place,'count':5,'language':'zh','format':'json'},cancel).get('results',[])
    if not locations:
        return {'reply':f'没有找到“{place}”的城市。请说城市全名，例如“杭州天气”；海外城市也可以用英文名。','status':'clarification','pending_weather':True,'sources':[]}
    loc=max(locations,key=lambda x:x.get('population',0))
    data=json_get('https://api.open-meteo.com/v1/forecast',{'latitude':loc['latitude'],'longitude':loc['longitude'],'current':'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m','daily':'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max','forecast_days':7,'timezone':'auto'},cancel)
    daily=data['daily']; current=data['current']
    def desc(code):
        if code==0:return '晴'
        if code in (1,2,3):return '多云' if code<3 else '阴'
        if code in (45,48):return '雾'
        if code in (51,53,55,56,57):return '毛毛雨'
        if code in (61,63,65,66,67,80,81,82):return '雨'
        if code in (71,73,75,77,85,86):return '雪'
        if code in (95,96,99):return '雷雨'
        return '天气状况代码'+str(code)
    name=' · '.join(dict.fromkeys(str(loc.get(k,'')) for k in ('name','admin1','country') if loc.get(k)))
    lines=[f'{name}（{data["timezone"]}）',f'天气模型当前值 {current["time"]}：{desc(current["weather_code"])}，{current["temperature_2m"]}℃，风速{current["wind_speed_10m"]} km/h。']
    indices=[1] if '明天' in text else [2] if '后天' in text else list(range(7)) if re.search(r'一周|7天|七天',text) else [0,1,2] if re.search(r'未来|三天|3天',text) else [0]
    if re.search(r'下周|下个月|\d{1,2}月\d{1,2}',text):
        lines.append('本版查询未来7天，下面列出未来7天预报，不代表你指定的更远日期。');indices=list(range(7))
    for i in indices:
        lines.append(f'{daily["time"][i]}：{desc(daily["weather_code"][i])}，{daily["temperature_2m_min"][i]}～{daily["temperature_2m_max"][i]}℃，最高降水概率{daily["precipitation_probability_max"][i]}%。')
    lines.append('来源：Open-Meteo。预报存在变化，模型当前值不等同于气象站实测。')
    return {'reply':'\n'.join(lines),'status':'ok','city':place,'sources':[{'title':'Open-Meteo天气数据','url':'https://open-meteo.com/en/docs','publisher':'Open-Meteo','published_at':current['time']}],'facts':'\n'.join(lines)}

def lookup(text, cancel, city='', pending=False):
    kind=intent(text)
    if not kind and pending and re.fullmatch(r'[\u4e00-\u9fffA-Za-z .-]{2,40}',text):kind='weather';text+='天气'
    if not kind:return None
    now=datetime.now().astimezone().isoformat(timespec='seconds')
    try:
        if kind=='news':
            import news_bulletin
            return news_bulletin.lookup(text,cancel)
        if kind=='date':return public_clock.reply(text,cancel)
        if kind=='weather':result=weather(text,cancel,city)
        else:
            import public_reach
            try:
                reach=public_reach.lookup(text,cancel)
                if reach:return {**reach,'checked_at':now}
            except InterruptedError:raise
            except Exception:
                # A named platform must not silently turn into unrelated webpages.
                if re.search(r'github|开源项目|B站|哔哩哔哩|v2ex|https://',text,re.I):raise
            sources=[]; failed=[]
            if kind=='news':
                world=bool(re.search(r'国内外|国际|国外|海外|世界|全球|美国|欧洲|俄|乌|world',text,re.I))
                domestic=not world or bool(re.search(r'国内|中国|国内外',text))
                category='finance' if re.search(r'财经|经济|金融',text) else 'culture' if re.search(r'文娱|娱乐|文化',text) else 'china'
                feeds=[]
                if domestic:feeds.append((f'https://www.chinanews.com.cn/rss/{category}.xml','中国新闻网'))
                if world:feeds.extend([('https://www.chinanews.com.cn/rss/world.xml','中国新闻网·国际'),('https://feeds.bbci.co.uk/news/world/rss.xml','BBC World')])
                for url,label in feeds:
                    try:sources+=rss(url,{},cancel,label,True)[:3]
                    except InterruptedError:raise
                    except Exception:failed.append(label)
                heading='查询到的近72小时新闻标题（不是全部新闻；不按重要性排序）'
                # Feed lookup is for broad headlines. Named subjects require a search.
                topic=re.sub(r'请|帮我|查一下|查查|查|看看|今天|最新|国内外|国内|国外|国际|中国|世界|全球|有什么|有哪些|新闻|资讯|头条|财经|经济|金融|文娱|娱乐|文化|的|一下|[？?，,。 ]','',text)
                if topic:
                    sources=rss('https://www.bing.com/search',{'q':text,'format':'rss','mkt':'zh-CN'},cancel,'')[:5]
                    heading='相关资讯网页（搜索摘要，未逐篇阅读全文；无日期的结果未核实发布时间）'
            else:
                query=SEARCH.sub('',text).strip(' ，,。？?')[:200]
                if not query:return {'reply':'你想联网查什么？例如“联网查新能源汽车资讯”。','status':'clarification','sources':[],'kind':kind,'checked_at':now}
                sources=rss('https://www.bing.com/search',{'q':query,'format':'rss','mkt':'zh-CN'},cancel,'')[:5]
                heading='相关网页（搜索摘要，未逐篇阅读全文；未标注日期的结果不能证明是最新消息）'
            seen=set();sources=[s for s in sources if not (s['url'] in seen or seen.add(s['url']))]
            if not sources:raise ValueError('no fresh usable items')
            lines=[heading]+[f'{i+1}. {s["title"]}\n{s["publisher"]} · {s["published_at"] or "发布时间未核实"}' for i,s in enumerate(sources)]
            if failed:lines.append('部分来源暂时不可达：'+'、'.join(failed))
            result={'reply':'\n'.join(lines),'status':'partial' if failed else 'ok','sources':sources,'facts':'\n'.join(lines)}
        return {**result,'kind':kind,'checked_at':now}
    except InterruptedError:raise
    except Exception:
        return {'reply':'这次联网查询没有成功，可能是网络或来源服务暂时不可达。没有获得可核实结果，我先不猜；你可以稍后重试。','status':'error','sources':[],'kind':kind,'checked_at':now}
