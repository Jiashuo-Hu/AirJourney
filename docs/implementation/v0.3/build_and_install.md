# v0.3 构建、安装与备份

安装包：release/v0.3/AirJourney-v0.3-x64-setup.exe；源码包：同目录AirJourney-v0.3-source.zip。外置SHA256SUMS.txt和package-verification.json记录摘要及源码/运行文件核对结果。产品v0.3、工程0.3.0，未签名。

安装前关闭旧程序，建议Settings → Data & backup → Export backup。运行Windows x64安装包；应用安装完成后所有功能和目录、字体、Logo、地图均在本地，无需联网。当前测试使用项目内独立安装/个人数据目录；旧航班、资料、SVG及schema 1不做自动覆盖迁移。

备份通过Export backup导出.airjourney，Import backup先预览。Replace entire personal library恢复完整偏好/个人资料，覆盖前导出当前内容；合并保留当前偏好并按冲突策略处理记录。重复路线模式可选字段不存在时默认加粗，旧备份无需改写。应用备份包含个人引用/Logo快照，基准目录仍随安装包提供。

源码重建：Node 24或支持的22.12+、npm，运行npm ci、npm test、npm run build、npm run package。依赖准备可能联网；运行包不需要开发环境。无需重抓资源。图标统一源public/app-logo.svg，更新时先node scripts/render-app-icon.cjs，再python scripts/create-icon.py；渲染工具使用Playwright及本机Chrome（AIRJOURNEY_PLAYWRIGHT可指定模块路径），Pillow写入多尺寸ICO。资源生成工具不属于正常应用运行依赖。

本地缓存首次启用PE图标资源编辑时，winCodeSign-2.6.0自带的macOS符号链接无法在当前Windows权限下解压。已将同一已下载包排除darwin目录解压到.tools/builder-cache/winCodeSign/winCodeSign-2.6.0，使用其中原始Windows rcedit工具；未关闭图标编辑，也未获取证书。签名日志不代表已签名，以Authenticode检查NotSigned为准。.tools不收入源码包。

专项程序回归：node scripts/v03-regression.cjs <安装的AirJourney.exe> <独立证据目录>。测试只用合成隔离库，包含千条重复、界面、备份与实际进程重启；原生图标探针scripts/verify-app-icon.ps1在运行窗口取WM_GETICON和PE图标。旧版恢复/软件比例和地图故障注入回归需分别按报告中的脚本及参数执行。

数据来源、缺项和许可见public/data/airlines-global-manifest.json、public/logos/airlines/manifest.json及public/notices/Airline-data-and-brands.txt。目录准备从保留的固定快照处理，不开发实时服务或爬虫。准备脚本需要Python、lxml/fontTools（矢量轮廓处理）及Playwright/Chrome；这些不影响直接编译已准备好的资源。
