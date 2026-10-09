"""Connection preferences. Keys are Windows DPAPI encrypted, never returned to UI."""
import base64
import ctypes
import json
from urllib.parse import urlparse
import config


class Blob(ctypes.Structure):
    _fields_ = [('cbData', ctypes.c_ulong), ('pbData', ctypes.POINTER(ctypes.c_ubyte))]


def crypt(raw, decrypt=False):
    buf = ctypes.create_string_buffer(raw)
    inp = Blob(len(raw), ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte)))
    out = Blob()
    fn = ctypes.windll.crypt32.CryptUnprotectData if decrypt else ctypes.windll.crypt32.CryptProtectData
    if not fn(ctypes.byref(inp), None, None, None, None, 1, ctypes.byref(out)):
        raise RuntimeError('无法使用 Windows 加密保存连接设置')
    try:
        return ctypes.string_at(out.pbData, out.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(out.pbData)


def load():
    path = config.DATA_DIR / 'connection.json'
    if not path.exists():
        return
    try:
        d = json.loads(path.read_text('utf-8'))
        config.DEEPSEEK_BASE_URL = d['base_url']
        config.DEEPSEEK_MODEL = d['model']
        if d.get('key'):
            config.DEEPSEEK_API_KEY = crypt(base64.b64decode(d['key']), True).decode('utf-8')
    except Exception:
        print('[connection] saved settings unavailable')


def public():
    return {'configured': bool(config.DEEPSEEK_API_KEY), 'base_url': config.DEEPSEEK_BASE_URL,
            'model': config.DEEPSEEK_MODEL}


def save(base_url, model, key):
    base_url = base_url.strip().rstrip('/')
    u = urlparse(base_url)
    if u.scheme not in ('http', 'https') or not u.hostname or u.username or u.password or u.query:
        raise ValueError('请填写有效的模型服务地址')
    if u.scheme == 'http' and u.hostname not in ('localhost', '127.0.0.1', '::1'):
        raise ValueError('远程模型服务请使用 HTTPS')
    model = model.strip()[:120]
    if not model:
        raise ValueError('请填写模型名称')
    # Empty input preserves the current configured key.
    secret = key.strip() if key.strip() else config.DEEPSEEK_API_KEY
    d = {'base_url': base_url, 'model': model,
         'key': base64.b64encode(crypt(secret.encode())).decode() if secret else ''}
    path = config.DATA_DIR / 'connection.json'
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(d), encoding='utf-8'); tmp.replace(path)
    config.DEEPSEEK_BASE_URL = base_url; config.DEEPSEEK_MODEL = model; config.DEEPSEEK_API_KEY = secret
    return public()
