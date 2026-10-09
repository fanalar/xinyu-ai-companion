# 完整脱敏源码下载

本项目以 MIT 许可证公开完整源码。**请先下载并解压 [xinyu-ai-companion-sanitized-source.zip](./xinyu-ai-companion-sanitized-source.zip)，再按下方说明运行。**

源码包包含全部 149 个经审查的源码、构建配置、演示素材和许可证文件，不含原 Git 历史、实际密钥、数据库、聊天、录音、签名材料或原私有媒体。模型和运行库按包内脚本另行下载。

网页浏览目录目前正在分批整理，仓库根目录的源码包是完整可用的公开分发版本。请勿直接在尚未整理齐全的网页目录上执行构建。

```powershell
Expand-Archive ./xinyu-ai-companion-sanitized-source.zip ./source
cd source
```

源码包 SHA-256：`462fe57b1a78b1af519e9f0e2a62cc49f9886dcd78ee5abe25cc38727f34012a`。验证边界见解压后的 `docs/VALIDATION.md`；自动化验证不代表真实模型或真机验收。

---

# 心屿 · AI Companion

MIT 开源的中文陪伴原型：Electron + React + FastAPI，桌面源码基于 1.4.1，附安卓 1.3.4 原生/WebView 客户端源码。

## 功能

- 进入陪伴页自动收音、停顿提交；外放保护覆盖整段朗读及尾音，耳机模式可直接插话。
- 沉浸页透明字幕最多两行；完整对话、独立伙伴记录、可编辑记忆与导出。
- 日期、天气、新闻及公开资讯渠道。来源可能限流或不可达，不保证任意历史新闻均能检索。
- 本地 SenseVoice/Silero 识别；聊天文本发送给你配置的模型，在线朗读文本发送给语音服务。不是“全部离线”或“无限免费”。

原有照片/角色视频/录音未分发，界面使用 MIT 几何占位图。你可自行换成有权使用的素材；模型与二进制依赖单独下载。

## 桌面开发（Windows，Python 3.11、Node.js 20+）

在仓库根目录执行：

```powershell
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

`.env` 的密钥默认为空。可在应用设置 → 连接中填写自己的模型配置；Windows 使用本机加密保存。文本及部分公开查询可先运行，语音识别要先下载模型：

```powershell
backend/.venv/Scripts/python scripts/fetch_speech_models.py
```

构建安装包：先构建前端，再用该虚拟环境执行 `python scripts/build_backend.py`，随后在 `app/` 执行 `npm run dist`。默认安装器图标可自行替换；没有提供签名证书。所有运行数据/模型/构建文件不应提交。

## 安卓源码

准备 Android SDK 35 与 JDK 17（Android Studio 可提供），配置本机 SDK 后：

```powershell
cd android/frontend
npm ci
npm run build
cd ../..
python scripts/prepare_android_ui.py
python scripts/fetch_speech_models.py --android
python scripts/android_gradle.py assembleDebug
```

运行时在安卓界面填模型配置；构建不注入密钥。Gradle 辅助脚本在本仓库 `.cache` 下载并校验工具。这里不分发 APK、原签名材料、模型或官方运行库；自行构建的 debug APK 不代表已通过你的真机验收。

## 数据、测试与许可

原 Git 历史、私密聊天、数据库、录音、日志、业务文档和个人路径未进入公共树。开源包用新的 Git 历史。公开版不带实际模型密钥；AI 服务可能产生你的账户费用。

原个人内测成绩不是开源版真人准确率保证。本次公开树的构建、离线示例API、静态扫描与安卓源码编译结果见发布说明；真实模型、麦克风及长期会话仍需运行者验证。

项目代码 MIT；Agent-Reach 公开渠道适配保留上游 MIT 通知；sherpa-onnx 为 Apache-2.0，SenseVoice/Silero/ONNX Runtime 等许可见 `docs/third-party`。MIT 不重新许可第三方模型。具体脱敏范围见 `docs/OPEN_SOURCE_SCOPE.md`，安全边界见 `SECURITY.md`。

