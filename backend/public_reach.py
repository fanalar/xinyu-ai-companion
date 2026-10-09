"""Agent-Reach public-channel adaptation, MIT, upstream a19a171.

Only public data: no shell execution, browser sessions, cookies or account access.
"""
import html
import ipaddress
import json
import re
import socket
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.parse import urlsplit, unquote, urlencode
import httpx
import public_clock

COMMIT = 'a19a171fa980a0785849596492e0af4db800c82f'
DEFINITIONS = {'search':('公开网页搜索','Exa MCP'), 'web':('网页阅读','Jina Reader / Exa'),
    'github':('GitHub公开项目','GitHub公开API'), 'bilibili':('B站视频搜索','B站公开API'),
    'v2ex':('V2EX热门讨论','V2EX公开API'), 'rss':('更多新闻来源','RSS')}
_last = {}
_lock = threading.Lock()

def settings():
    import db
    return {key:db.get_setting('reach:'+key, '1') != '0' for key in DEFINITIONS}

def save_settings(values):
    import db
    for key, value in values.items():
        if key not in DEFINITIONS or not isinstance(value, bool): raise ValueError('来源设置不正确')
    for key,value in values.items(): db.set_setting('reach:'+key, '1' if value else '0')
    return status()

def mark(key, ok, count=0):
    with _lock:
        _last[key] = {'status':'connected' if ok else 'unreachable','count':count,
            'note':f'实际取得{count}条公开结果' if ok else '未连接成功或未返回可用内容',
            'checked_at':datetime.now(timezone.utc).isoformat()}

def status():
    enabled=settings()
    with _lock: last=dict(_last)
    return {'implementation':'Agent-Reach desktop public-channel adaptation','upstream_commit':COMMIT,
        'channels':[{'id':key,'label':label,'backend':backend,'enabled':enabled[key],
            **last.get(key,{'status':'unchecked','note':'尚未检查'})} for key,(label,backend) in DEFINITIONS.items()]}

def public_url(url, dns=False):
    if not isinstance(url,str) or len(url)>2000 or re.search(r'[\s\x00-\x1f\x7f\\]',url): raise ValueError('请提供公开HTTPS链接')
    u=urlsplit(url)
    host=(u.hostname or '').rstrip('.').lower()
    if u.scheme!='https' or u.username or u.password or u.fragment or u.port not in (None,443) or '.' not in host:
        raise ValueError('只读取公开HTTPS网页')
    if host.endswith(('.local','.localhost','.localdomain','.internal','.lan','.home.arpa')) or host=='metadata.google.internal':
        raise ValueError('不读取内网地址')
    if re.search(r'(?:^|&)(?:access_token|token|api_key|apikey|password|session|authorization|signature|sig|cookie|auth|key)=',unquote(u.query),re.I):
        raise ValueError('请使用不含登录或签名参数的公开链接')
    try:
        if not ipaddress.ip_address(host).is_global: raise ValueError('不读取本机或内网地址')
    except ValueError as e:
        if '不读取' in str(e): raise
    if dns:
        for result in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM):
            if not ipaddress.ip_address(result[4][0]).is_global: raise ValueError('网页解析到内网地址')
    return url

def request(url,cancel,post=None,accept='application/json'):
    if cancel.is_set(): raise InterruptedError()
    with httpx.Client(timeout=httpx.Timeout(12,connect=5),follow_redirects=False) as client:
        with client.stream('POST' if post is not None else 'GET',url,json=post,
            headers={'Accept':accept,'User-Agent':'XinyuPersonalBeta/1.4.0','Cache-Control':'no-cache'}) as response:
            response.raise_for_status()
            public_clock.observe(response.headers,url)
            chunks=[];size=0
            for chunk in response.iter_bytes():
                if cancel.is_set(): raise InterruptedError()
                size+=len(chunk)
                if size>2_000_000: raise ValueError('公开来源响应过大')
                chunks.append(chunk)
    if cancel.is_set(): raise InterruptedError()
    return b''.join(chunks).decode('utf-8',errors='replace')

def rpc(raw):
    if raw.lstrip().startswith('{'): return json.loads(raw)
    for event in re.split(r'\r?\n\r?\n',raw):
        text='\n'.join(line[5:].strip() for line in event.splitlines() if line.startswith('data:'))
        if not text: continue
        obj=json.loads(text)
        if 'result' in obj or 'error' in obj: return obj
    raise ValueError('公开搜索格式变化')

def call(name,args,cancel):
    obj=rpc(request('https://mcp.exa.ai/mcp',cancel,{'jsonrpc':'2.0','id':1,'method':'tools/call',
        'params':{'name':name,'arguments':args}},'application/json, text/event-stream'))
    result=obj.get('result',{})
    if 'error' in obj or result.get('isError') or not result: raise ValueError('来源未返回有效内容')
    return result

def clean(value,size=350):
    return html.unescape(re.sub(r'<[^>]*>','',str(value or ''))).strip()[:size]

def stamp(value):
    if not value: return None
    try:
        dt=datetime.fromisoformat(str(value).replace('Z','+00:00'))
        if dt.tzinfo is None: dt=dt.replace(tzinfo=public_clock.CHINA_TIME)
        return dt.isoformat()
    except ValueError: return None

def search(query,cancel):
    if not query.strip() or len(query)>500: raise ValueError('关键词为空或过长')
    try:
        result=call('web_search_exa',{'query':query,'numResults':6,'objective':'Return original public URLs and publication dates, excluding directories, advertisements and login pages.'},cancel)
        rows=result.get('structuredContent',{}).get('results')
        if rows is None:
            body='\n'.join(block.get('text','') for block in result.get('content',[]))
            rows=[]
            for block in re.split(r'(?m)^Title:\s*',body)[1:]:
                title=block.split('\n',1)[0]
                url=re.search(r'(?m)^URL:\s*(.+)',block)
                date=re.search(r'(?mi)^Published (?:Date|Time):\s*(.+)',block)
                text=re.search(r'(?ms)^(?:Text|Highlights):\s*(.*)',block)
                if url: rows.append({'title':title,'url':url[1].strip(),'publishedDate':date[1].strip() if date else '', 'text':text[1] if text else ''})
        items=[]
        for row in rows[:12]:
            try: url=public_url(row.get('url',''))
            except ValueError: continue
            title=clean(row.get('title'),180)
            if title: items.append({'title':title,'url':url,'publisher':urlsplit(url).hostname,
                'published_at':stamp(row.get('publishedDate')),'snippet':clean(row.get('text')),'aggregator':True})
        if not items: raise ValueError('搜索没有可引用的结果')
        mark('search',True,len(items));return items
    except InterruptedError: raise
    except Exception: mark('search',False);raise

def read(url,cancel):
    public_url(url,True)
    try:
        try:
            raw=request('https://r.jina.ai/'+url,cancel)
            reader='Jina Reader'
        except httpx.HTTPError:
            result=call('web_fetch_exa',{'urls':[url],'maxCharacters':6000},cancel)
            raw='\n'.join(block.get('text','') for block in result.get('content',[]));reader='Exa网页阅读'
        if raw.lstrip().startswith('{'):
            data=json.loads(raw).get('data',{})
            title=data.get('title','网页');content=data.get('content','');published=stamp(data.get('publishedTime'))
        else:
            title=re.search(r'(?m)^(?:Title: |# )(.+)$',raw)
            title=title[1] if title else '网页';content=raw.split('Markdown Content:',1)[-1];published=None
        if re.search(r'Title: (Just a moment|Attention Required)|requiring CAPTCHA|performing security verification',raw,re.I) or len(content.strip())<40:
            raise ValueError('网站要求验证或没有公开正文')
        content=re.sub(r'!\[[^\]]*\]\([^\n]+\)','',content)
        content=re.sub(r'\[([^\]]+)\]\([^\n)]+\)',r'\1',content).strip()
        mark('web',True,1)
        return {'title':clean(title,180),'url':url,'publisher':urlsplit(url).hostname,'published_at':published,
            'content':content[:6000],'reader':reader,'truncated':len(content)>6000}
    except InterruptedError: raise
    except Exception: mark('web',False);raise

def platform(key,query,cancel):
    try:
        if key=='github':
            repo=re.search(r'github\.com/([\w.-]+/[\w.-]+)',query)
            url='https://api.github.com/repos/'+repo[1].rstrip('.') if repo else 'https://api.github.com/search/repositories?'+urlencode({'q':query or 'artificial intelligence','sort':'updated','per_page':6})
            raw=json.loads(request(url,cancel));rows=[raw] if repo else raw.get('items',[])
            items=[{'title':r['full_name'],'url':r['html_url'],'publisher':'GitHub公开项目','published_at':stamp(r.get('created_at')),
                'updated_at':stamp(r.get('updated_at')),'snippet':clean(r.get('description')),'stars':r.get('stargazers_count',0)} for r in rows[:6]]
        elif key=='v2ex':
            rows=json.loads(request('https://www.v2ex.com/api/topics/hot.json',cancel))
            items=[{'title':clean(r['title'],180),'url':r['url'].replace('http:','https:',1),'publisher':'V2EX社区讨论',
                'published_at':datetime.fromtimestamp(r['created'],timezone.utc).isoformat(),'snippet':clean(r.get('content'))} for r in rows[:6]]
        elif key=='bilibili':
            raw=json.loads(request('https://api.bilibili.com/x/web-interface/search/all/v2?'+urlencode({'keyword':query or '人工智能','page':1}),cancel))
            if raw.get('code')!=0: raise ValueError('B站暂时限制公开搜索')
            rows=[r for group in raw['data']['result'] if group.get('result_type')=='video' for r in group.get('data',[])][:6]
            items=[{'title':clean(r['title'],180),'url':'https://www.bilibili.com/video/'+r['bvid'],'publisher':'B站视频',
                'published_at':datetime.fromtimestamp(r['pubdate'],timezone.utc).isoformat() if r.get('pubdate') else None,'snippet':clean(r.get('description'))} for r in rows if re.fullmatch(r'BV[\w]+',r.get('bvid',''))]
        else: raise ValueError('未接入此来源')
        items=[r for r in items if public_url(r['url'])]
        if not items: raise ValueError('来源没有可用结果')
        mark(key,True,len(items));return items
    except InterruptedError: raise
    except Exception: mark(key,False);raise

def probe(cancel):
    import online_lookup
    tasks={'search':lambda:search('人工智能公开资讯',cancel),'web':lambda:[read('https://example.com',cancel)],
        'github':lambda:platform('github','https://github.com/Panniantong/Agent-Reach',cancel),
        'bilibili':lambda:platform('bilibili','人工智能',cancel),'v2ex':lambda:platform('v2ex','',cancel),
        'rss':lambda:online_lookup.rss('https://www.ithome.com/rss/',{},cancel,'IT之家')}
    pool=ThreadPoolExecutor(max_workers=6)
    try:
        futures={pool.submit(task):key for key,task in tasks.items() if settings()[key]}
        for future in as_completed(futures):
            if cancel.is_set(): raise InterruptedError()
            try: mark(futures[future],True,len(future.result()))
            except InterruptedError: raise
            except Exception: mark(futures[future],False)
    finally: pool.shutdown(wait=False,cancel_futures=True)
    return status()

def lookup(text,cancel):
    enabled=settings();query=re.sub(r'帮我|请|搜一下|搜索|查一下|查查|查询|联网|上网','',text).strip()[:300]
    key='github' if re.search('github|开源项目',text,re.I) else 'bilibili' if re.search('bilibili|B站|哔哩哔哩',text,re.I) else 'v2ex' if re.search('v2ex',text,re.I) else None
    if key:
        if not enabled[key]: return {'kind':'search','status':'clarification','sources':[],'reply':'这个资讯来源已关闭，可在设置的“联网资讯”中开启。'}
        items=platform(key,re.sub(r'(?i)github|B站|哔哩哔哩|v2ex|公开项目|项目|热门讨论|视频','',query).strip() if 'https://' not in query else query,cancel)
        heading={'github':'公开开源项目','bilibili':'公开视频搜索（未观看视频或读取字幕）','v2ex':'社区热门讨论（不是新闻）'}[key]
    else:
        url=re.search(r'https://[^\s<>"，。！？]+',text)
        if url and re.search(r'读|阅读|看看|看一下|总结|介绍',text):
            if not enabled['web']: return {'kind':'search','status':'clarification','sources':[],'reply':'网页阅读已关闭，可在联网资讯设置中开启。'}
            item=read(url[0],cancel)
            return {'kind':'web','status':'ok','sources':[item], 'reply':f'{item["title"]}\n\n公开正文节选（{item["reader"]}）：\n{item["content"]}'+ ('\n\n正文较长，已截取前6000字。' if item['truncated'] else '')}
        if not enabled['search']: return None
        items=search(query,cancel);heading='公开网页搜索（搜索摘要，未逐篇阅读全文）'
    reply=heading+'\n'+ '\n'.join(f'{i+1}、{r["title"]}\n{r["publisher"]} · {r.get("published_at") or "发布时间未核实"}\n{r.get("snippet","")}' for i,r in enumerate(items))
    return {'kind':'search','status':'ok','sources':items,'reply':reply}
