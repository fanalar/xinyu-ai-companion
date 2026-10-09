"""Dated short news bulletin built from current feed facts, not model recollection."""
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
import online_lookup as web
import public_clock
import public_reach
import json

CHINA_TIME=timezone(timedelta(hours=8))
AI_TERMS=('人工智能','ai','openai','大模型','智能体','chatgpt','gpt','算力','机器学习')
NEWS_MEDIA=('新华社','新华网','央视','中国新闻网','人民日报','人民网','经济日报','科技日报','央广','中国日报','财联社','第一财经','澎湃','界面','证券时报','证券日报','上海证券报','中国证券报','每日经济新闻','21世纪经济','新浪','36氪','IT之家','量子位','机器之心','华尔街见闻','钛媒体','BBC','Reuters','路透','美联社','AP News','CNBC','TechCrunch','Bloomberg','彭博','金融时报','Financial Times','RFI','德国之声','美国之音')
_calendar_cache={}

def topic_of(text):
    if re.search(r'人工智能|(?<![a-z])ai(?![a-z])|大模型|智能体|chatgpt|openai',text,re.I):return '人工智能'
    for topic in ('新能源汽车','科技','财经','体育','汽车','军事','金融','教育','文化','娱乐','房地产','半导体','机器人'):
        if topic in text:return topic
    if re.search(r'(国内外|国际|国内|国外|海外|世界|全球|每日|日常|综合)(的)?(新闻|资讯|头条)|新闻和资讯',text):return ''
    topic=re.sub(r'\d{4}年|\d{1,2}月\d{1,2}[日号]|能不能|可不可以|可以|麻烦|帮我|请|一下|一些|查查|查询|搜索|联网|上网|给我|我想听|我想看|我想|听听|说说|告诉我|播报|播一下|播|读一下|念一下|讲讲|看看|介绍|相关|每日|每天|今天|今日|昨天|最新|最近|近一周|这周|国内外|国内|国外|国际|中国|世界|全球|有什么|有哪些|新闻|资讯|头条|早报|晚报|简报|的|查|[？?，,。!！\s]','',text)
    return topic[:60]

def news_range(text,now):
    midnight=now.replace(hour=0,minute=0,second=0,microsecond=0)
    if re.search(r'明天|后天',text):return {'future':True}
    match=re.search(r'(?:(\d{4})年)?(\d{1,2})月(\d{1,2})[日号]',text)
    if match:
        try:start=datetime(int(match[1] or now.year),int(match[2]),int(match[3]),tzinfo=CHINA_TIME)
        except ValueError:return {'invalid':True}
        return {'after':start,'before':min(now,start+timedelta(days=1)),'future':start>now,'label':start.date().isoformat()}
    if '昨天' in text:return {'after':midnight-timedelta(days=1),'before':midnight,'label':'昨天'}
    if re.search('今天|今日',text):return {'after':midnight,'before':now,'label':'今天'}
    if re.search('近一周|最近一周|这周',text):return {'after':now-timedelta(days=7),'before':now,'label':'近7天'}
    return {'after':now-timedelta(hours=48),'before':now,'label':'近48小时'}

def within(item,range,now):
    try:published=datetime.fromisoformat(item['published_at']).astimezone(CHINA_TIME)
    except (KeyError,TypeError,ValueError):return False
    # Historical dates have an exclusive next-midnight bound.
    return range['after']<=published and (published<=range['before']+timedelta(minutes=10) if range['before']==now else published<range['before'])

def parse_search(raw):
    match=re.search(r'\bvar\s+docArr\s*=\s*(\[.*?\])\s*;',raw.decode('utf-8'),re.S)
    if not match:raise ValueError('新闻搜索页面结构变化')
    items=[]
    from urllib.parse import urlsplit
    for row in json.loads(match[1])[:30]:
        url=web.safe_link(row.get('url',''))
        host=urlsplit(url).hostname or ''
        title=web.clean(''.join(row['title']) if isinstance(row.get('title'),list) else row.get('title',''),180)
        if not url or not title or not (host=='chinanews.com.cn' or host.endswith('.chinanews.com.cn')):continue
        try:published=datetime.strptime(row.get('pubtime',''),'%Y-%m-%d %H:%M:%S').replace(tzinfo=CHINA_TIME).isoformat()
        except ValueError:published=None
        items.append({'title':title,'url':url.replace('http:','https:',1),'publisher':'中国新闻网·关键词搜索','published_at':published,'snippet':web.clean(row.get('content_without_tag',''),180)})
    return items

def relevant(item,topic):
    hay=item['title'].lower()
    if re.search(r'联系我们|联系电话|地址信息|爱企查|地图|招生|认证项目|招商',item['title']):return False
    if re.search(r'第[一二三四五六七八九十\d]+天[：:]|精彩回顾|域名.*注册|优惠|代办|Moomoo',item['title'],re.I):return False
    if item.get('aggregator'):
        domains=('news.cn','xinhuanet.com','cctv.com','chinanews.com.cn','people.com.cn','cnr.cn','chinadaily.com.cn','stcn.com','cls.cn','thepaper.cn','yicai.com','jiemian.com','sina.com.cn','ithome.com','36kr.com','reuters.com','apnews.com','bbc.com','bbc.co.uk','rfi.fr')
        publisher=item.get('publisher','').lower()
        if not any(name.lower() in publisher for name in NEWS_MEDIA) and not any(publisher==d or publisher.endswith('.'+d) for d in domains):return False
    if topic=='人工智能':return bool(re.search(r'(?<![a-z])ai(?![a-z])',hay)) or any(t in hay for t in AI_TERMS if t!='ai')
    return not topic or topic.lower() in hay

def select(items,topic='',limit=12,chronological=True):
    ranked=sorted(items,key=lambda x:datetime.fromisoformat(x['published_at']).timestamp() if x.get('published_at') else 0,reverse=True) if chronological else items
    result=[];fingerprints=[];urls=set()
    for item in ranked:
        if not relevant(item,topic) or item['url'] in urls:continue
        title=re.sub(r'\s*-\s*[^-]{2,20}$','',item['title']) if item.get('aggregator') else item['title']
        key=re.sub(r'\W','',title).lower()
        if any(SequenceMatcher(None,key,old).ratio()>=.76 for old in fingerprints):continue
        urls.add(item['url']);fingerprints.append(key)
        result.append({**item,'bullet':title.strip('。')+'。'})
        if len(result)>=limit:break
    return result

def lunar_date(date,cancel):
    key=date.isoformat()
    if key in _calendar_cache:return _calendar_cache[key]
    try:
        data=web.json_get('https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php',{'date':key},cancel)
        value=data.get('LunarDate','').replace('閏','闰')
        if not re.fullmatch(r'闰?[正一二三四五六七八九十冬腊]+月[初十廿卅一二三四五六七八九]+',value):return ''
        if cancel.is_set():raise InterruptedError()
        _calendar_cache[key]=value
        return value
    except InterruptedError:raise
    except Exception:return ''

def render(items,now,lunar,topic='',partial=False,range_label='近48小时',clock_verified=True):
    weekday='一二三四五六日'[now.weekday()]
    greeting='周末愉快！' if now.weekday()>=5 else '愿你今天顺心！'
    lead=f'{now.month}月{now.day}日，每日'+(topic+'资讯' if topic else '新闻')+f'，星期{weekday}，'+('农历'+lunar if lunar else '农历暂未核实')+'，'+greeting
    scope=f'{now.year}年，截至北京时间{now:%H:%M}，{range_label}精选{len(items)}条。'
    if len(items)<12:scope+='符合条件的消息不足12条，按实际数量播报。'
    if partial:scope+='部分来源暂时不可达。'
    if not clock_verified:scope+='联网核时未成功，以上依据电脑系统时间。'
    words=('把今天过好，不必急着证明什么。一步一步来，你的认真终会成为底气。','留一点时间给自己，慢慢走也算向前。愿今天的小小进步，带来明天的从容。','不必把每一天都过得完美。照顾好自己，再认真做一件值得的小事。')
    quote=words[now.toordinal()%len(words)]
    body=[lead,scope,'']+[f'{i+1}、{item["bullet"]}' for i,item in enumerate(items)]+['','【微语】'+quote]
    speech='\n'.join([lead,scope]+[f'{i+1}、{item["bullet"]}' for i,item in enumerate(items)]+['今日微语。'+quote])
    return '\n'.join(body),speech

def lookup(text,cancel):
    clock=public_clock.current(cancel);now=datetime.fromtimestamp(clock['now_ms']/1000,CHINA_TIME);topic=topic_of(text)
    range=news_range(text,now)
    base={'kind':'news','checked_at':now.isoformat(),'bulletin':True,'clock':clock}
    if range.get('future') or range.get('invalid'):
        return {**base,'status':'clarification','sources':[],'reply':f'今天是{now:%Y年%m月%d日}（北京时间）。'+('未来的新闻还没有发生，不能当作事实播报。' if range.get('future') else '这个日期无效，请检查月份和日期。')}
    international=bool(re.search(r'国外|国际|海外|世界|全球',text)) and '国内外' not in text
    domestic=bool(re.search(r'国内|中国',text)) and '国内外' not in text
    jobs=[];enabled=public_reach.settings()
    if topic:
        # A domestic source can remain available when the aggregator is unreachable.
        for category in ('scroll-news','finance'):
            jobs.append((f'https://www.chinanews.com.cn/rss/{category}.xml',{},'中国新闻网'))
    else:
        categories=['world'] if international else ['china','society','finance'] if domestic else ['china','society','finance','world']
        for category in categories:jobs.append((f'https://www.chinanews.com.cn/rss/{category}.xml',{},'中国新闻网·'+{'china':'国内','society':'社会','finance':'财经','world':'国际'}[category]))
    channel='gj' if international else 'gn' if domestic else 'all'
    jobs.append(('https://sou.chinanews.com.cn/search.do',{'q':topic,'sortType':'time','searchField':'title','channel':channel},'中新关键词搜索'))
    if enabled['rss']:
        if not international or topic:jobs.append(('https://www.ithome.com/rss/',{},'IT之家'))
        if international or not domestic:
            jobs.extend([('https://feeds.bbci.co.uk/news/world/rss.xml',{},'BBC World'),('https://www.rfi.fr/cn/rss',{},'RFI')])
    def fetch(job):
        url,params,label=job
        data=parse_search(web.get(url,params,cancel)) if label=='中新关键词搜索' else web.rss(url,params,cancel,label)
        if label=='Google新闻':
            for item in data:
                item['aggregator']='Google新闻'
                # Feed title carries the original publication name.
                if ' - ' in item['title']:item['publisher']=item['title'].rsplit(' - ',1)[1]
        return data
    pool=ThreadPoolExecutor(max_workers=5)
    items=[];failed=[];checks=[]
    try:
        futures={pool.submit(fetch,job):job[2] for job in jobs}
        for future in as_completed(futures):
            if cancel.is_set():raise InterruptedError()
            try:
                result=future.result();items.extend(result);checks.append({'source':futures[future],'status':'connected','count':len(result)})
            except InterruptedError:raise
            except Exception:failed.append(futures[future]);checks.append({'source':futures[future],'status':'unreachable','count':0})
    finally:pool.shutdown(wait=False,cancel_futures=True)
    items=[i for i in items if within(i,range,now)]
    if len(select(items,topic))<4:
        if enabled['search']:
            try:
                target=range['after'].date().isoformat()
                more=public_reach.search(f'{target} {range["label"]} {topic or ("国际" if international else "国内外")} 新闻报道，原始媒体与发布时间',cancel)
                items.extend(i for i in more if within(i,range,now));checks.append({'source':'Exa公开新闻搜索','status':'connected','count':len(more)})
            except InterruptedError:raise
            except Exception:failed.append('Exa公开新闻搜索');checks.append({'source':'Exa公开新闻搜索','status':'unreachable','count':0})
        try:
            more=fetch(('https://news.google.com/rss/search',{'q':(topic or ('国际新闻' if international else '新闻'))+' when:7d','hl':'zh-CN','gl':'CN','ceid':'CN:zh-Hans'},'Google新闻'))
            items.extend(i for i in more if within(i,range,now));checks.append({'source':'Google新闻备用','status':'connected','count':len(more)})
        except InterruptedError:raise
        except Exception:failed.append('Google新闻备用');checks.append({'source':'Google新闻备用','status':'unreachable','count':0})
    # Balance categories in a general daily digest instead of filling it with one feed.
    if not topic and not international and not domestic:
        balanced=[]
        for label in dict.fromkeys(j[2] for j in jobs):
            balanced+=select([i for i in items if i['publisher']==label],limit=3)
        chosen=select(balanced+items,limit=12,chronological=False)
    else:chosen=select(items,topic)
    if not chosen:
        connected=any(c['status']=='connected' for c in checks)
        message=f'当前日期：{now:%Y年%m月%d日}（北京时间）。\n'+(f'已经联网，但没有找到{range["label"]}与“{topic or "新闻"}”匹配、且有明确报道时间的结果。可以改查“近一周{topic or "国际"}新闻”。' if connected else '新闻来源均未连接成功，请检查网络后重试。')
        if not clock['verified']:message+='联网核时未成功，以上依据电脑系统时间。'
        return {**base,'reply':message,'status':'error','sources':[],'source_checks':checks,'requested_range':range['label']}
    lunar=lunar_date(now.date(),cancel)
    reply,speech=render(chosen,now,lunar,topic,bool(failed),range['label'],clock['verified'])
    sources=[{k:v for k,v in i.items() if k not in ('bullet','snippet')} for i in chosen]
    return {**base,'reply':reply,'speech_text':speech,'status':'partial' if failed or not clock['verified'] else 'ok','sources':sources,'source_checks':checks,'topic':topic,'item_count':len(chosen),'lunar':lunar,'window_hours':(range['before']-range['after']).total_seconds()/3600,'requested_range':range['label']}
