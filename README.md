# AirJourney v0.1

高度自由、可自定义的Windows个人飞行旅程记录App。用户手动提供航班信息，App本地保存并在三维地球上呈现示意路线。

当前版本为 v0.1（工程 0.1.0），按照 [本轮提示词](docs/planning/13_V0_1_IMPLEMENTATION_PROMPT.md)完成地图、缩放交互和航线改进，并修复 AF-01–AF-05。历史 v0.0 报告与产物保留。[独立 v0.1 验收](docs/acceptance/20261011-v01-independent/report.md)结论为基本功能通过；新发现1项P2和2项P3，详见[缺陷清单](docs/acceptance/20261011-v01-independent/issues.md)。

安装包 `release/v0.1/AirJourney-v0.1-x64-setup.exe`；源码包 `release/v0.1/AirJourney-v0.1-source.zip`；SHA-256 和完整交付清单在同目录。

本地实现阶段结束后，用户另行授权上传 GitHub，发布目标为 [v0.1](https://github.com/Jiashuo-Hu/AirJourney/releases/tag/v0.1)。[发布说明](docs/implementation/github_release_v0.1.md)记录产物与已知问题。项目代码使用根目录 MIT LICENSE；第三方资源各自的来源、许可与限制见清单。

交付与检查：[v0.1 实现记录](docs/implementation/v0.1/implementation_summary.md)、[自测报告](docs/implementation/v0.1/test_report.md)、[已知问题](docs/implementation/v0.1/known_issues.md)、[需求追踪](docs/implementation/v0.1/requirements_traceability.csv)、[构建安装](docs/implementation/v0.1/build_and_install.md)、[备份恢复](docs/implementation/backup_and_restore.md)、[资源清单](docs/implementation/v0.1/resource_manifest.csv)、[历史独立验收](docs/acceptance/20261010-independent-functional/report.md)。

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


