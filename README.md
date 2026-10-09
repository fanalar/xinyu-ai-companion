<div align="center">

# 心屿 · Xinyu AI Companion

**给日常，留一点温柔。**  
**A little warmth for your everyday life.**

让对话有声音，让陪伴有画面。中文语音陪伴原型，支持 Windows 桌面与 Android 源码。  
A Chinese voice companion prototype with an immersive character view, Windows desktop code, and an Android client.

[完整源码 / Download source](./xinyu-ai-companion-sanitized-source.zip) · [快速开始 / Quick start](#快速开始--quick-start) · [参与贡献 / Contribute](https://github.com/fanalar/xinyu-ai-companion/issues)

**MIT code · Windows 1.4.1 · Android source 1.3.4 · Personal beta**

![沉浸陪伴示例 / Immersive companion demo](docs/showcase/immersive.jpg)

</div>

## 一句“在忙什么呀”，开始今天的陪伴 / Start with “What are you up to?”

下班后想说说今天，睡前想有人听你讲两句，或只是想聊一件小事——心屿围绕角色、语音和日常记忆，探索更自然的陪伴体验。  
Talk about your day, unwind before bed, or share a small moment. Xinyu explores companionship through characters, voice, and editable everyday memories.

| 日常关心 / Everyday check-in | 晚安陪聊 / A quiet bedtime chat |
|---|---|
| ![日常示例对白 / Scripted daily conversation](docs/showcase/daily-chat.jpg) | ![晚安示例对白 / Scripted bedtime conversation](docs/showcase/goodnight-chat.jpg) |
| “在忙什么呀？今天有没有想我一点点？” | “今天最开心的小事是什么？再小的事，我也想听。” |
| “What are you up to? Have you missed me a little today?” | “What was your happiest little moment today? I’d love to hear it.” |

*以上为虚构示例对白，在隔离数据中截图；展示相处语气，不代表真实用户记录、实际模型验收或后台主动推送。截图使用原项目展示素材，源码包默认采用占位图。*  
*These are scripted, fictional conversations captured with isolated demo data. They illustrate tone, not real chats, live-model acceptance, or background notifications. Screenshots use project preview artwork; the source archive uses placeholders by default.*

## 你可以体验什么 / What you can explore

| 功能 / Feature | 体验 / Experience |
|---|---|
| 连续语音 / Continuous voice | 进入陪伴页开启收音，停顿后提交。外放模式在朗读时保护收音；耳机模式支持语音插话，外放可点击打断。 / Listen on entry and submit after a pause. Speaker mode gates capture during playback; headphone mode supports voice interruption, with manual interruption available on speakers. |
| 沉浸陪伴 / Immersive view | 人物占据主要画面，透明字幕最多两行；随时切换完整聊天。 / A character-focused view with up to two subtitle lines and a full-chat view when needed. |
| 六位伙伴 / Six companions | 选择角色，调整名字、个性、声音与相处方式。 / Choose a character and customize their name, personality, voice, and relationship style. |
| 日常记忆 / Everyday memories | 独立伙伴记录、可编辑记忆和数据导出。 / Separate companion records, editable memories, and data export. |
| 天气与资讯 / Weather & information | 日期、天气、新闻与公开资讯渠道；来源受可达性和限流影响。 / Date-aware weather, news, and public information lookup, subject to source availability and rate limits. |
| 宠物小窝 / Pet corner | 把宠物互动加入日常陪伴。 / A pet interaction space alongside conversation. |

## 遇见你的伙伴 / Meet your companions

<table>
<tr>
<td align="center"><img src="docs/showcase/f1.jpg" width="220" alt="清知 / Qingzhi"><br><b>清知 · Qingzhi</b><br>清冷知性 / Calm & thoughtful</td>
<td align="center"><img src="docs/showcase/f2.jpg" width="220" alt="小野 / Xiaoye"><br><b>小野 · Xiaoye</b><br>甜酷元气 / Playful & spirited</td>
<td align="center"><img src="docs/showcase/f3.jpg" width="220" alt="晚晚 / Wanwan"><br><b>晚晚 · Wanwan</b><br>温柔治愈 / Warm & gentle</td>
</tr>
<tr>
<td align="center"><img src="docs/showcase/m1.jpg" width="220" alt="砚清 / Yanqing"><br><b>砚清 · Yanqing</b><br>清冷学霸 / Quiet & intellectual</td>
<td align="center"><img src="docs/showcase/m2.jpg" width="220" alt="阿野 / Aye"><br><b>阿野 · Aye</b><br>甜酷年下 / Lively & affectionate</td>
<td align="center"><img src="docs/showcase/m3.jpg" width="220" alt="承屿 / Chengyu"><br><b>承屿 · Chengyu</b><br>成熟温柔 / Steady & caring</td>
</tr>
</table>

<p align="center"><img src="docs/showcase/bunny.png" width="180" alt="云仔兔兔 / Bunny companion"><br><b>云仔 · Bunny companion</b><br>聊聊日常，也给小兔一点陪伴。 / A little pet companionship, too.</p>

## 快速开始 / Quick start

**完整可运行源码在 ZIP 中。网页源码目录仍在整理，请先解压源码包，不要直接构建目前的部分网页目录。**  
**The complete source is in the ZIP archive. The browsable Git tree is still being organized; extract the archive before building.**

需要 / Requirements: **Windows · Python 3.11 · Node.js 20+**。

```powershell
Invoke-WebRequest "https://github.com/fanalar/xinyu-ai-companion/raw/refs/heads/main/xinyu-ai-companion-sanitized-source.zip" -OutFile source.zip
Expand-Archive ./source.zip ./xinyu-source
cd xinyu-source
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
cd frontend
npm ci
npm run build
cd ../app
npm ci
npm start
```

在应用设置中填写自己的模型连接。语音识别需要按包内 README 下载 SenseVoice/Silero 模型；默认配置不包含任何实际密钥。  
Configure your own model connection in Settings. Follow the archive README to download the SenseVoice/Silero speech models. No real API keys are bundled.

**Android 源码 / Android source:** 包内 `android/`，需要 JDK 17、Android SDK 35；运行 `scripts/prepare_android_ui.py`、`scripts/fetch_speech_models.py --android` 和 `scripts/android_gradle.py assembleDebug`。详细准备步骤见包内 README。  
The archive includes `android/`. Use JDK 17 and Android SDK 35; follow the included README for UI preparation, model downloads, and the debug build. No prebuilt APK or signing credentials are distributed here.

## 开放、可改造 / Open to your own ideas

技术栈 / Stack: **Electron · React · FastAPI · SQLite · SenseVoice · Silero VAD**。

欢迎改进语音识别与打断、新闻来源、角色交互、无障碍体验或英文界面。请在 Issue 中说明设备、复现步骤和预期效果，并移除私密聊天与密钥。  
Contributions are welcome: voice recognition and interruption, news sources, character interactions, accessibility, or an English UI. Include your device, reproduction steps, and expected behavior in an issue, without private chats or credentials.

## 当前状态与许可 / Status & licensing

- 个人内测原型，暂无收款或正式订阅。 / Personal beta prototype; no live billing or paid subscription.
- 前端构建、隔离 API、安卓 Java 源码编译与密钥扫描通过；真实模型、真人声学与完整 APK 验收未完成。 / Frontend builds, isolated APIs, Android Java compilation, and secret scans passed. Live-model, real acoustic, and complete APK acceptance remain unverified.
- 本地保存记录与配置；聊天及在线朗读会使用你配置的外部服务，服务可能收费。 / Records and configuration are stored locally; chat and online speech use external services, which may charge your account.
- 代码 [MIT](./LICENSE)；展示图片与截图的素材说明见 [MEDIA_NOTICE](docs/showcase/MEDIA_NOTICE.md)，第三方模型遵循各自许可。 / Code is MIT; preview image terms are separate, and third-party models keep their own licenses.
- 完整源码包 SHA-256：`462fe57b1a78b1af519e9f0e2a62cc49f9886dcd78ee5abe25cc38727f34012a`。

**如果这个方向对你有用，欢迎 Star，或提交一个具体建议。**  
**If this direction is useful to you, leave a star or share a concrete suggestion.**
