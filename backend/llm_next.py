"""Cancellable streaming generation. Log status codes, never provider bodies or keys."""
import json
import time
import httpx
import config


def probe():
    if not config.DEEPSEEK_API_KEY:
        return {'ok': False, 'message': '尚未保存模型密钥，请先填写并保存。'}
    started = time.monotonic()
    try:
        with httpx.Client(timeout=httpx.Timeout(15, connect=6)) as cli:
            r = cli.post(config.DEEPSEEK_BASE_URL + '/chat/completions',
                headers={'Authorization': 'Bearer ' + config.DEEPSEEK_API_KEY},
                json={'model': config.DEEPSEEK_MODEL, 'messages': [{'role': 'user', 'content': '请只回复：你好'}],
                      'max_tokens': 16, 'stream': False})
            messages = {401: '密钥无效或已过期，请检查后重新保存。', 403: '该密钥没有访问权限，请检查服务权限。',
                        429: '服务额度不足或请求过于频繁，请检查余额和限制。',
                        404: '服务地址或模型不存在，请检查地址和模型名称。', 400: '服务不接受当前模型或请求，请检查模型名称。'}
            if r.status_code != 200:
                return {'ok': False, 'message': messages.get(r.status_code, f'模型服务暂时异常（HTTP {r.status_code}）。')}
            choices = r.json().get('choices') or []
            if not choices or not (choices[0].get('message') or {}).get('content'):
                return {'ok': False, 'message': '服务可访问，但未返回可用的对话内容，请检查接口兼容性或模型设置。'}
            return {'ok': True, 'message': '连接成功，模型已返回测试回复。', 'latency_ms': round((time.monotonic() - started) * 1000)}
    except httpx.TimeoutException:
        return {'ok': False, 'message': '连接超时，请检查网络、代理与服务地址。'}
    except httpx.RequestError:
        return {'ok': False, 'message': '无法连接模型服务，请检查网络、代理与服务地址。'}
    except Exception:
        return {'ok': False, 'message': '服务响应无法解析，请确认使用兼容的对话接口。'}


def chat(messages, temperature=0.8, max_tokens=500, model=None, cancel=None):
    if not config.DEEPSEEK_API_KEY:
        return None
    models = list(dict.fromkeys([model or config.DEEPSEEK_MODEL, 'deepseek-chat']))
    for name in models:
        if cancel and cancel.is_set():
            return None
        try:
            with httpx.Client(timeout=httpx.Timeout(30, connect=8)) as cli:
                with cli.stream('POST', config.DEEPSEEK_BASE_URL + '/chat/completions',
                    headers={'Authorization': 'Bearer ' + config.DEEPSEEK_API_KEY},
                    json={'model': name, 'messages': messages, 'temperature': temperature,
                          'max_tokens': max_tokens, 'stream': True}) as r:
                    if r.status_code in (401, 403, 429):
                        return None
                    if r.status_code != 200:
                        if r.status_code in (400, 404):
                            continue
                        return None
                    pieces = []
                    for line in r.iter_lines():
                        if cancel and cancel.is_set():
                            return None
                        if not line.startswith('data:'):
                            continue
                        raw = line[5:].strip()
                        if raw == '[DONE]':
                            break
                        data = json.loads(raw)
                        choices = data.get('choices') or []
                        if choices:
                            value = choices[0].get('delta', {}).get('content')
                            if value:
                                pieces.append(value)
                    return ''.join(pieces).strip() or None
        except Exception:
            print('[llm] request unavailable')
            return None
    return None
