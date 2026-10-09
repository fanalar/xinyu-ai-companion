"""心屿 · AI恋人 桌面版 - 后端配置"""
import os
import sys
from pathlib import Path

FROZEN = getattr(sys, "frozen", False)

if FROZEN:
    # PyInstaller 打包后：资源在 _MEIPASS，数据走 LOCALAPPDATA
    BASE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    STATIC_DIR = BASE_DIR / "frontend_dist"
    _default_data = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "XinyuLover"
else:
    BASE_DIR = Path(__file__).resolve().parent
    STATIC_DIR = BASE_DIR.parent / "frontend" / "dist"
    _default_data = BASE_DIR / "data"

# 数据目录（可被 Electron 覆盖为 userData）
DATA_DIR = Path(os.environ.get("XINYU_DATA_DIR") or str(_default_data))
DATA_DIR.mkdir(parents=True, exist_ok=True)
AVATAR_DIR = DATA_DIR / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
TTS_CACHE_DIR = DATA_DIR / "tts_cache"
TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "xinyu.db"


def _load_dotenv(path: Path):
    if path.exists():
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv(BASE_DIR.parent / ".env")


DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1").rstrip("/")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

ZHIPU_API_KEY = os.environ.get("ZHIPU_API_KEY", "")
ZHIPU_IMAGE_URL = "https://open.bigmodel.cn/api/paas/v4/images/generations"
ZHIPU_IMAGE_MODEL = os.environ.get("XINYU_IMAGE_MODEL", "cogview-3-flash")

EDGE_TTS_PROXY = os.environ.get("EDGE_TTS_PROXY", "")
PORT = int(os.environ.get("XINYU_PORT", "8123"))

# 语音识别（复用 Hermes venv 的 faster-whisper GPU 引擎）
FFMPEG = os.environ.get("XINYU_FFMPEG", "ffmpeg")          # 需在 PATH 中，或用 XINYU_FFMPEG 指定
HERMES_STT_PY = os.environ.get("XINYU_STT_PY", sys.executable)   # 运行 STT 服务的解释器
STT_PORT = int(os.environ.get("XINYU_STT_PORT", "8890"))
STT_MODEL = os.environ.get("XINYU_STT_MODEL", "small")

APP_NAME = "心屿 · AI恋人"
VERSION = "1.4.1"
BOOT_ID = os.environ.get('XINYU_BOOT_ID', '')
