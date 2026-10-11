# v0.1 构建、安装和备份说明

产品 v0.1，工程 0.1.0；Windows x64。安装包 `release/v0.1/AirJourney-v0.1-x64-setup.exe`，源码 ZIP 和 SHA256SUMS.txt 同目录。安装包携带 Electron 和本地资源，无需开发工具或 WebView2。未签名；实际本机安装结果见 evidence/v0.1/install.json。

```powershell
npm ci --no-audit --no-fund
npm test
npm run build
npm run package
```

开发使用 Node24 或 Vite 支持的 Node22.12+；第一次取得依赖需联网。构建不调用下载/发布脚本，资源已在 public。prepare-map-tiles.py 是一次性的本地资源制作脚本，需已有 .tools/naturalearth-source.zip；正常构建不需它。prepare-package.mjs 只重建经路径核对的 .tools/desktop-app staging。输出目录固定 release/v0.1，旧安装包保留。

本机使用 .tools/package/bin/npm-cli.js 和 .tools/bin/npm.cmd，日志在 evidence/v0.1。完整 source/resources/delivery 校验运行 `node scripts/deliver-v01.mjs`，在测试结果及文档就绪之后执行。该脚本只读写本地文件，不上传或推送。

界面回归脚本 `scripts/v01-regression.cjs`、`scripts/v01-upgrade-display.cjs` 使用 Playwright 的 Electron 驱动，可通过 AIRJOURNEY_PLAYWRIGHT 指定模块。它们接受实际 AirJourney.exe 和新输出目录，不使用开发服务器。缩放检查用 Electron 软件 scale-factor，合成触控事件不能替代真实触控板。

运行安装向导选择当前用户与目录。本轮实际安装到项目下的隔离目录 evidence/v0.1/installed-app；所有测试通过 AIRJOURNEY_TEST_DIR 使用隔离库，未修改默认个人数据目录。用户正常数据仍在 %LOCALAPPDATA%/AirJourney。升级前可在 Settings → Data & backup → Export backup 导出；原 schema1 库和 v0.0 .airjourney 备份兼容。

备份包含快照、个人 SVG/底图、资料、字段、标签、设置与时间精度。导入先预览，可合并/保留或替换冲突、全量恢复；覆盖前导出备份。详见原 backup_and_restore.md 的格式和操作说明，v0.1 默认导出名为 AirJourney-v0.1.airjourney。卸载默认保留个人库。

本次没有 GitHub 推送/Release/PR/上传；未来发布需用户另行明确授权。
