<div align="center">

<p><a href="./README.md"><kbd>English</kbd></a>&nbsp;&nbsp;<a href="./README.zh-CN.md"><kbd><b>简体中文</b></kbd></a></p>

# 心屿 · AI 恋人

### 从一句“在忙什么呀”，开始今天的陪伴。

有声音的对话、有画面的陪伴，还有可以自己编辑的日常记忆。  
面向 Windows 桌面与 Android 的中文 AI 陪伴原型。

[**下载完整源码**](./xinyu-ai-companion-sanitized-source.zip) · [**开始运行**](#开始运行) · [**看看示例对白**](#今天有没有想我一点点) · [**提出建议**](https://github.com/fanalar/xinyu-ai-companion/issues)

**代码 MIT · Windows 1.4.1 · Android 源码 1.3.4 · 个人内测**

![心屿沉浸陪伴外观预览](docs/showcase/immersive.jpg)

</div>

## 给日常，留一点温柔

有些时候，你想说的不是一个问题，而是今天发生的一件小事：下班路上看到的晚霞、还没说出口的开心，或者睡前放不下的那点烦心事。

心屿把这些日常对话放进一个看得见伙伴、听得到回应的空间。你可以选择角色与相处方式，调整名字、个性和声音；可以开口聊，也可以安静地打字；可以沉浸在人物画面里，也可以打开完整对话，回看或整理值得记住的内容。

这是一个持续打磨中的中文陪伴原型，也是一份可以自己运行、修改和探索的开源代码。它适合喜欢角色交互、语音应用和可编辑记忆的开发者，也欢迎愿意帮助完善体验的内测者。

## 今天有没有想我一点点？

### 下班后的日常关心

> **你：** 刚下班，终于可以歇一会儿。  
> **晚晚：** 在忙什么呀？今天有没有想我一点点？先好好吃饭，我陪你慢慢聊。

![下班后的日常关心示例](docs/showcase/daily-chat.jpg)

### 睡前，聊一件开心的小事

> **你：** 明天还有好多事，有点睡不着。  
> **晚晚：** 先把明天放一放吧。今天最开心的小事是什么？再小的事，我也想听。

![晚安陪聊示例](docs/showcase/goodnight-chat.jpg)

这些是为介绍制作的**虚构示例对白**，使用隔离演示数据，表达期望的相处语气。实际回答取决于你配置的模型与角色设置，不保证逐字复现。它们不表示已经实现后台主动消息，也不是实际模型或真人语音验收结果。预览使用原项目角色素材；源码包默认带占位图。

## 陪伴体验是怎样组织的？

### 1. 开口之后，可以接着聊

进入陪伴页会尝试开启收音，检测到停顿后提交语音，让一轮对话结束后可以继续下一轮。文字输入始终保留，方便在安静环境、公共场所或没有麦克风时使用。

**外放模式与耳机模式有所区别：** 外放模式在朗读期间保护收音，避免把自己的声音当成用户；可以点击停止来打断。耳机模式支持语音插话，并取消上一轮回复。真实设备的识别效果、停顿时长和回声表现仍需要实测。

### 2. 让人物画面留在中心

沉浸模式把人物作为主要画面，透明字幕最多显示两行，减少长对话遮挡。需要回看、复制消息、搜索记录或输入文字时，可以切换到完整聊天视图。

它提供的是两种互补的入口：沉浸页关注当下的陪伴，完整对话页方便整理信息。

### 3. 选择伙伴，也调整相处方式

六位预设伙伴各有不同的气质。名字、个性、声音与关系类型可以调整，方便尝试朋友、知己、恋人或生活搭子等相处方式。伙伴记录相互独立，避免把不同角色的对话混在一起。

### 4. 记忆可以查看，也可以修改

有些内容只需要聊过就好，有些内容值得留下。心屿提供可编辑记忆、独立伙伴记录和数据导出，让你能够检查、修正或移除保存的内容。

这是一套可检查的本地记录机制，不是“永远不会忘记”或“完全理解你”的承诺。模型仍可能遗漏上下文或给出不准确的回答。

### 5. 日常话题，也能连接公开信息

天气、日期、新闻与公开资讯可以作为日常聊天的话题入口。查询结果受来源、发布时间、网络可达性和限流影响；它不保证找到任意历史新闻，也不保证所有渠道一直可用。

### 6. 给宠物一点陪伴

宠物小窝为日常陪伴增加一个轻松的互动空间。除了人物对话，也可以和云仔兔兔打个招呼，探索宠物互动与陪伴场景的结合。

## 遇见你的伙伴

<table>
<tr>
<td align="center"><img src="docs/showcase/f1.jpg" width="220" alt="清知"><br><b>清知</b><br>清冷知性 · 安静、克制，也认真倾听</td>
<td align="center"><img src="docs/showcase/f2.jpg" width="220" alt="小野"><br><b>小野</b><br>甜酷元气 · 轻快、活泼，分享日常</td>
<td align="center"><img src="docs/showcase/f3.jpg" width="220" alt="晚晚"><br><b>晚晚</b><br>温柔治愈 · 温暖地接住你的话题</td>
</tr>
<tr>
<td align="center"><img src="docs/showcase/m1.jpg" width="220" alt="砚清"><br><b>砚清</b><br>清冷学霸 · 理性、安静的相处方式</td>
<td align="center"><img src="docs/showcase/m2.jpg" width="220" alt="阿野"><br><b>阿野</b><br>甜酷年下 · 亲近、活泼，轻松聊天</td>
<td align="center"><img src="docs/showcase/m3.jpg" width="220" alt="承屿"><br><b>承屿</b><br>成熟温柔 · 稳重地聊聊今天</td>
</tr>
</table>

<p align="center"><img src="docs/showcase/bunny.png" width="200" alt="云仔兔兔"><br><b>云仔兔兔</b><br>聊聊日常，也给小兔一点陪伴。</p>

展示素材与代码的许可不同，具体说明见 [素材说明](docs/showcase/MEDIA_NOTICE.md)。

## 适合哪些探索？

| 你想做什么 | 可以从哪里开始 |
|---|---|
| 运行自己的中文陪伴原型 | 下载源码，选择伙伴，配置自己的模型连接 |
| 学习语音对话应用 | 研究收音、停顿提交、朗读保护与轮次取消 |
| 设计角色与记忆体验 | 调整角色设置，完善记忆编辑与记录导出 |
| 改进新闻和天气查询 | 检查来源、日期判断、失败提示与结果展示 |
| 参与安卓适配 | 查看原生识别接口、WebView 页面与设备差异 |

目前界面主要为中文；这里的语言按钮只切换项目介绍，不切换应用界面语言。

## 开始运行

> **先解压完整源码包。** 仓库网页源码目录仍在整理，当前完整构建配置、前后端与 Android 代码在 ZIP 中。不要直接构建尚未齐全的网页目录。

### 桌面开发

准备 **Windows、Python 3.11、Node.js 20 或更高版本**。以下命令用于 PowerShell：

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

启动后，在应用设置中配置自己的模型地址、模型名和密钥。源码不带实际服务密钥。日常模型聊天需要有效连接；部分公开信息查询可以单独尝试。

### 准备语音模型

在解压后的源码根目录执行：

```powershell
backend/.venv/Scripts/python scripts/fetch_speech_models.py
```

脚本下载 SenseVoice、Silero 等运行资源。模型和运行库遵循各自的上游许可，不属于代码 MIT 的重新授权。网络不可达时先检查下载来源与连接，文字界面仍可用于探索。

### 构建桌面安装包

先完成前端构建，再在源码根目录与 `app/` 中依次执行：

```powershell
backend/.venv/Scripts/python scripts/build_backend.py
cd app
npm run dist
```

公开仓库提供源码，不提供已经验收的签名安装器。自行构建的安装包需要测试安装、升级、数据迁移和实际语音设备。

### 构建 Android 调试包

准备 **JDK 17、Android SDK 35**，按源码包 README 配好本机 SDK，再执行：

```powershell
cd android/frontend
npm ci
npm run build
cd ../..
python scripts/prepare_android_ui.py
python scripts/fetch_speech_models.py --android
python scripts/android_gradle.py assembleDebug
```

没有内置运营方密钥、签名材料或预制 APK。Android 的收音、音频路由和识别效果需要在目标手机上验证。

## 从代码里可以学到什么？

| 层次 | 主要技术 | 职责 |
|---|---|---|
| 桌面外壳 | Electron | 桌面窗口、启动与打包 |
| 交互界面 | React | 人物舞台、聊天、设置与记忆页面 |
| 本地服务 | FastAPI | 对话、配置、语音与公开信息接口 |
| 记录存储 | SQLite | 伙伴、消息与可编辑记忆 |
| 语音识别 | SenseVoice、Silero VAD | 本地识别与语音活动检测 |
| Android | Java、WebView | 手机客户端及原生语音接口 |

语音识别可以在本地运行；模型聊天和在线朗读仍会使用外部服务。它并不是全部离线的软件，也不承诺模型服务无限免费。

## 常见问题

<details>
<summary>为什么介绍图与刚运行的界面不完全一样？</summary>

预览使用了原项目人物素材，源码 ZIP 默认使用新的 SVG 占位图。示例界面在独立副本中暂停麦克风并调整人物构图，便于展示；它不是原安装包的逐像素截图。可以自行替换为有权使用的图片。

</details>

<details>
<summary>为什么有字幕，但模型不回复？</summary>

识别、聊天模型和朗读是不同环节。先检查模型地址、模型名、密钥及网络，再检查语音模型是否下载齐全。不要将密钥或完整私人聊天发到 Issue。

</details>

<details>
<summary>已经支持主动发消息或正式订阅了吗？</summary>

当前示例对白不代表后台主动消息。项目仍为个人内测原型，没有接入真实支付，也没有正式收费订阅。相关方向可以讨论，但不作为现成功能宣传。

</details>

## 一起把体验打磨好

欢迎从一个具体问题开始：不同麦克风的识别、外放与耳机切换、停顿过早或过晚、新闻日期与来源、记忆编辑、无障碍或界面本地化。

在 [Issue](https://github.com/fanalar/xinyu-ai-companion/issues) 中说明设备、版本、复现步骤、预期结果和实际结果；示例录音或日志应先去除身份信息、密钥和私密内容。也欢迎提出新的角色交互想法。

如果这个方向对你有用，欢迎 **Star**，让更多对语音与角色陪伴感兴趣的人发现它。

## 当前验证与开源边界

前端构建、隔离示例 API、Android Java 源码编译和指定公开源码的密钥扫描已通过。真实模型、真人声学、完整 APK 和长期会话体验仍需验收，不能把示例图或模拟测试当成真实通过。

记录和配置保存在本地；聊天与在线语音可能向你配置的外部服务发送内容并产生费用。原私密聊天、实际数据库、密钥和旧 Git 历史不在公开源码包中。

代码采用 [MIT](./LICENSE)。展示素材见 [素材说明](docs/showcase/MEDIA_NOTICE.md)，模型和其他依赖保持各自许可。

源码包 SHA-256：`462fe57b1a78b1af519e9f0e2a62cc49f9886dcd78ee5abe25cc38727f34012a`。

<p align="center"><a href="./README.md"><kbd>Switch to English</kbd></a></p>
