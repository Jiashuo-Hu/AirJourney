# AirJourney v0.2

高度自由、可自定义的Windows个人飞行旅程记录App。用户手动提供航班信息，App本地保存并在三维地球上呈现示意路线。

当前版本为 v0.2（工程 0.2.0），依据[本轮范围](docs/planning/15_V0_2_SCOPE.md)扩充86,242条全球机场资料、247个国家/地区代码，加入可搜索机场选择与明确位置类型，并收纳常驻说明和低频选项。个人元数据与原航班快照保留；机场位置按16号范围固定。历史 v0.0/v0.1 报告与产物保留；本次地图与位置更新已通过[轻量独立验收](docs/acceptance/20261014-v02-map-followup/report.md)，完整设备与长期测试仍未完成。

最新更新：[地图、悬停标签与固定机场位置](docs/implementation/v0.2/map-and-location-update/implementation_summary.md)、[更新测试](docs/implementation/v0.2/map-and-location-update/test_report.md)。版本保持v0.2/0.2.0，原交付快照保留。

安装包 `release/v0.2/AirJourney-v0.2-x64-setup.exe`；源码包 `release/v0.2/AirJourney-v0.2-source.zip`；SHA-256 和完整交付清单在同目录。

简要历史更新见 [update_log.txt](update_log.txt)。2026-10-14 用户另行授权将当前项目同步到 GitHub；本次更新仓库源码、资源、文档及验收记录，不创建 PR 或 Release。安装产物、依赖、缓存及个人运行数据不提交到 Git。此前v0.1的授权发布记录见[历史发布说明](docs/implementation/github_release_v0.1.md)。项目代码使用根目录 MIT LICENSE；第三方资源各自的来源、许可与限制见清单。实现报告中的“仅本地、未上传”描述当时交付状态。

交付与检查：[v0.2实现记录](docs/implementation/v0.2/implementation_summary.md)、[自测报告](docs/implementation/v0.2/test_report.md)、[已知问题](docs/implementation/v0.2/known_issues.md)、[需求追踪](docs/implementation/v0.2/requirements_traceability.csv)、[构建安装/备份](docs/implementation/v0.2/build_and_install.md)、[机场覆盖与来源](public/data/airports-global-manifest.json)、[资源清单](docs/implementation/v0.2/resource_manifest.csv)、[历史v0.1独立验收](docs/acceptance/20261011-v01-independent/report.md)。

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


