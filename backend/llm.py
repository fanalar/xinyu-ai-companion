"""LLM 客户端：OpenAI 兼容（DeepSeek），自动降级模型"""
import httpx

import config


def chat(messages: list, temperature: float = 0.8, max_tokens: int = 500, model: str = None) -> str | None:
    if not config.DEEPSEEK_API_KEY:
        return None
    models = [model or config.DEEPSEEK_MODEL, "deepseek-chat", "deepseek-v3"]
    last_err = None
    for m in models:
        try:
            with httpx.Client(timeout=httpx.Timeout(45.0, connect=10.0)) as cli:
                r = cli.post(
                    f"{config.DEEPSEEK_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {config.DEEPSEEK_API_KEY}"},
                    json={"model": m, "messages": messages,
                          "temperature": temperature, "max_tokens": max_tokens},
                )
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"].strip()
            last_err = f"{m}: HTTP {r.status_code} {r.text[:150]}"
            if r.status_code == 401:
                return None
        except Exception as e:  # noqa: BLE001
            last_err = f"{m}: {e}"
    print("[llm] failed:", last_err)
    return None
