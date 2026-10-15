# AirJourney v0.3

高度自由、可自定义的Windows个人飞行旅程记录App。用户手动提供航班信息，App本地保存并在三维地球上呈现示意路线。

当前版本为 v0.3（工程 0.3.0），依据[本轮范围](docs/planning/17_V0_3_SCOPE.md)新增重复路线加粗/分开显示及持久化、统一标准App图标、7,761条航司参考目录、20家完整矢量Logo（其中19家独立图形），以及再次点击取消选中。保留86,242条机场资料、个人数据和历史快照；机场位置继续按16号范围固定。

最新更新：[v0.3实现](docs/implementation/v0.3/implementation_summary.md)、[测试](docs/implementation/v0.3/test_report.md)、[限制](docs/implementation/v0.3/known_issues.md)。大量重复路线允许共享通道，不改里程；目录状态和品牌覆盖如实记录，不宣称全部现役或全部最新。完整设备与长期测试仍未完成。

安装包 `release/v0.3/AirJourney-v0.3-x64-setup.exe`；源码包 `release/v0.3/AirJourney-v0.3-source.zip`；SHA-256 和完整交付清单在同目录。

简要历史更新见 [update_log.txt](update_log.txt)。2026-10-15，用户在本地交付与独立验收之后另行授权完善文档并上传GitHub，本次同步当前源码、静态资源和文档至[项目仓库](https://github.com/Jiashuo-Hu/AirJourney)，不创建Release或上传安装附件。安装产物、依赖、缓存及个人运行数据不提交到Git；本地产物位置和校验方式见[同步说明](docs/implementation/github_sync_v0.3.md)。代码为MIT；航司数据库为ODbL派生数据，品牌版权商标及个别用途限制另见[资源说明](public/notices/Airline-data-and-brands.txt)。

实现自测：48项单元、5项机场资源策略、同一安装版62项运行场景通过；[简短独立验收](docs/acceptance/20261015-v03-independent/report.md)在限定范围内PASS，未发现阻断问题。仍有一项P3：浅色陆地上的Repeated routes文案对比度偏低。任务栏实际像素与旧固定图标缓存、真实DPI/触控板、低配长时及完整安装卸载矩阵等未测；不据此宣称地图间歇故障已彻底根治。

交付与检查：[需求追踪](docs/implementation/v0.3/requirements_traceability.csv)、[构建安装/备份](docs/implementation/v0.3/build_and_install.md)、[航司来源与缺项](public/data/airlines-global-manifest.json)、[Logo来源/条件](public/logos/airlines/manifest.json)、[资源清单](docs/implementation/v0.3/resource_manifest.csv)、[历史v0.2轻量验收](docs/acceptance/20261014-v02-map-followup/report.md)。

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


