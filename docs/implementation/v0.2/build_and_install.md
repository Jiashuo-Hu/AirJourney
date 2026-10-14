> 初次 v0.2 交付记录（保留历史）。当前同版本更新以 [地图与位置策略说明](map-and-location-update/implementation_summary.md)、[最新测试](map-and-location-update/test_report.md) 和 [当前限制](map-and-location-update/known_issues.md) 为准。手工机场位置编辑/新增已撤销，原产物在 release/v0.2/before-map-location-update。

# v0.2 构建、安装与备份

产品v0.2，工程0.2.0，Windows x64。使用随包安装程序release/v0.2/AirJourney-v0.2-x64-setup.exe；不需要开发工具或WebView2。正常运行资源全本地，无机场查询或自动下载。

开发：Node24或Vite支持的Node22.12+，首次安装依赖需要联网。

```powershell
npm ci --no-audit --no-fund
npm test
python tests/test_airport_resources.py
npm run build
npm run package
```

本机Node/npm在Codex运行时和项目.tools中，electron-builder子进程需要把.tools/bin加入PATH。首次打包工具可能下载Electron/NSIS；这是开发构建，不是用户运行依赖。初次打包因未找到npm而失败，配置PATH后成功，保留日志。

机场资源已在public/data；正常构建不需重新生成或联网。scripts/prepare-airports.py只读取.tools/v0.2-sources/airports.csv、countries.csv及缺坐标时的cities500.zip。原始输入摘要见airports-global-manifest.json；未来重取上游可能变化，核对快照摘要，不冒充完全相同的输入。地图瓦片保持既有v0.1静态资源。

scripts/v02-regression.cjs和v02-upgrade-display.cjs用Playwright Electron驱动真实AirJourney.exe；接受exe及输出目录，可通过AIRJOURNEY_PLAYWRIGHT指定模块位置。所有运行使用AIRJOURNEY_TEST_DIR隔离构造数据；不操作默认个人数据库。本机实际安装到evidence/v0.2/installed-app。

```powershell
node scripts/v02-regression.cjs release/v0.2/win-unpacked/AirJourney.exe evidence/v0.2/regression-new
node scripts/v02-upgrade-display.cjs release/v0.2/win-unpacked/AirJourney.exe evidence/v0.2/upgrade-new
node scripts/deliver-v02.mjs
```

正常数据仍在%LOCALAPPDATA%/AirJourney。升级前Settings→Data & backup→Export backup；v0.0/v0.1 schema1库及.airjourney备份兼容。导入先预览，支持合并/保留/替换冲突及全量恢复，覆盖前导出备份。备份保存个人资料/覆盖、航班快照、位置类型和来源、SVG/底图、字段、标签及设置；全球只读基准随安装包提供，备份不重复嵌入86,242条。选择过的机场完整快照在备份内，恢复不会因基准变动静默改写记录。

默认备份名AirJourney-v0.2.airjourney。原backup_and_restore.md的格式仍适用；全量恢复个人库不删除当前安装包的全球基准。Library的Data tools导出个人JSON/CSV，基准原文件可在源码包public/data取得。

本轮未执行任何GitHub写入或上传。
