# AirJourney v0.0

高度自由、可自定义的Windows个人飞行旅程记录App。用户手动提供航班信息，App本地保存并在三维地球上呈现示意路线。

当前已实现S0–S4主要功能并交付可安装候选。[独立功能验收](docs/acceptance/20261010-independent-functional/report.md)结论为基本功能可用，记录四项P2、一项P3。以docs/planning/07_ACCEPTANCE.md为当前通过标准；该结论不代表全部子项和设备矩阵通过。历史报告继续保留。

安装包 `release/AirJourney-v0.0-x64-setup.exe`；源码包 `release/AirJourney-v0.0-source.zip`；SHA-256 见 `release/SHA256SUMS.txt`。包元数据为 0.0.0，未升级版本。

GitHub 下载：[v0.0 Release](https://github.com/Jiashuo-Hu/AirJourney/releases/tag/v0.0)。Release 安装包与源码 ZIP 保持原交付字节；仓库同时包含后续同步的规划和独立验收文档。项目代码使用根目录 MIT LICENSE；第三方地图、字体、SVG 与运行时各自的许可和商标限制见资源清单，项目许可证不替代它们。

交付与检查：[实现记录](docs/implementation/implementation_summary.md)、[自测报告](docs/implementation/test_report.md)、[已知问题](docs/implementation/known_issues.md)、[需求追踪](docs/implementation/requirements_traceability.csv)、[构建安装](docs/implementation/build_and_install.md)、[备份恢复](docs/implementation/backup_and_restore.md)、[资源清单](docs/implementation/resource_manifest.csv)、[SVG 来源与限制](docs/implementation/asset_registry.csv)。

```powershell
npm ci --no-audit --no-fund
npm test
npm run build
npm run package
```

开发环境为 Windows x64、Node 24 或支持的 Node 22.12+。安装包携带 Electron 和本地资源；用户运行不需要开发工具或 WebView2。

从[当前规划总览](docs/planning/00_README.md)开始；[实验计划](docs/planning/10_EXPERIMENTS.md)、[实现/验收交接任务书](docs/planning/08_AGENT_HANDOFF.md)供后续两个Agent使用。

唯一有效基线位于docs/planning；docs/archive中的旧稿已整体失效，不能合并使用。

项目根目录：C:/MyFile/Project/AirJourney。


