# 构建、安装与卸载

版本固定 v0.0，构建工具元数据 0.0.0。安装包 `release/AirJourney-v0.0-x64-setup.exe`，SHA-256 见同目录 `SHA256SUMS.txt` 和 `delivery_manifest.json`。未购买签名证书；实际 Authenticode 检测见交付/安装证据。不要把 builder 的 signing 日志当作已签名结论。

## 从源码构建

Windows x64、Node 24（或 Vite 支持的 Node 22.12+），可用 npm。开发时一次性联网取得锁定依赖，正常运行完全本地。

```powershell
npm ci --no-audit --no-fund
npm test
npm run build
npm run package
```

`prepare-package.mjs` 将 dist、desktop 和唯一壳运行依赖 sql.js 放入 `.tools/desktop-app`；Electron builder 生成完整 NSIS 运行时包，前端开发依赖不进入安装包。package-lock.json 是依赖基线。资源已经固定在 public，构建不运行采集脚本。`prepare-assets.py` 仅用于重新制作资源，需要明确的开发阶段本地源文件；不是 App 更新任务。

本机没有 npm 的 PATH 入口，实际构建使用 `.tools/package/bin/npm-cli.js` 和 `.tools/bin/npm.cmd` 包装器；构建日志保存在 evidence。该机器下载的 npm/NSIS/Electron 缓存不作为用户运行依赖。工具缓存不纳入源代码交付。

## 安装

运行安装包，选择当前用户与目标目录。安装包携带 Chromium/Node、地图、Workers、字体、SVG 和 SQLite WASM；不需要 Node、Rust、开发服务器、地图 token、账户或 WebView2。没有联网 bootstrapper。当前设备安装后的实测和干净机验收是两个不同结论，见 test_report。

安装后的程序可执行文件 AirJourney.exe。最小窗口 1024×720 logical px。Windows 对未签名候选可能给出信誉提示，签名状态如实保留。

## 个人数据

安装目录只放程序。数据在 `%LOCALAPPDATA%/AirJourney/`，Sources/Data & backup 显示实际路径。包含 `airjourney.sqlite`、`.previous`、Chromium 本地缓存；无个人资料云同步。卸载配置 `deleteAppDataOnUninstall=false`，默认保留个人库。卸载后重新安装应恢复原有记录。

在数据目录为空的首次启动显示空 journal，**没有默认测试航班**。交付证据使用隔离的测试目录；合成数据仅在 evidence 中。

## 独立验收入口

先校验 hash，断网后在新用户/干净 Win11 环境安装，再按规划 AC-01–24 操作。不用开发服务器。已有和没有 WebView2 的环境都不应影响本 Electron 包；没有 WebView2 的干净环境仍需要实际验证，当前不因理论独立而标 PASS。
