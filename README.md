# AirJourney v0.4

Windows个人飞行记录App，英语界面、完全本地使用。用户手动记录航班，三维地球呈现机场之间的示意航线；不查航班真实性、实际轨迹或实时信息。

当前产品v0.4 / 工程0.4.0，本地候选范围见[18_V0_4_SCOPE](docs/planning/18_V0_4_SCOPE.md)。提供Departure/Arrival分组表单、柔和航线和机场连接、新地球+飞机图标。航司资源扩至115家完整矢量标志，92家独立图形；默认优先图形，23家暂无可靠图形者使用完整文字标志，完整文字版保留在资料库。覆盖欧洲31、亚洲46、美洲24、大洋洲8、非洲6家，不宣称全球全部或全部最新。

随包86,242条机场和7,764条航司参考。机场资料只读，不新增、不修改名称、代码、城市、时区、位置等信息；保留既有航班、个人资料、历史快照、完整备份恢复，以及航班自己的当地时间/时区填写。其他资料和个人SVG仍可自定义。

交付：release/v0.4/AirJourney-v0.4-x64-setup.exe、AirJourney-v0.4-source.zip；SHA256SUMS.txt及delivery_manifest.json在同目录。详细[实现说明](docs/implementation/v0.4/implementation_summary.md)、[自测报告](docs/implementation/v0.4/test_report.md)、[限制和未测项](docs/implementation/v0.4/known_issues.md)、[构建安装与备份](docs/implementation/v0.4/build_and_install.md)、[需求追踪](docs/implementation/v0.4/requirements_traceability.csv)。自测不替代独立验收。

v0.4于2026-10-15完成本地实现、测试和打包；2026-10-16用户另行授权完善文档并同步GitHub。当前同步源码、静态资源及文档，不创建PR或Release，不上传安装附件，详见[本次同步说明](docs/implementation/github_sync_v0.4.md)。[简短独立验收](docs/acceptance/20261015-v04-offline/report.md)结论为有条件通过：代码、构建与交付核对通过，真实交互和动态视觉待人工确认。简要版本历史见[update_log.txt](update_log.txt)。

代码MIT；数据库ODbL/原来源条款，品牌版权商标另计。资源[来源与限制](public/notices/Airline-data-and-brands.txt)、[品牌逐项清单](public/logos/airlines/manifest.json)、[地区覆盖及纯图形缺项](public/data/airline-sources/v04-coverage.json)随包提供，原SVG保留。不将“免费下载”视为已获得再分发或商业使用权。

```powershell
npm ci --no-audit --no-fund
npm test
npm run build
npm run package
```

Node 24或兼容22.12+，Windows x64。必须等待构建完成后打包；安装后运行不需要开发环境。可从[当前规划总览](docs/planning/00_README.md)开始，最新迭代范围优先于旧基线中的机场编辑能力。docs/archive不是实现依据。

项目：C:/MyFile/Project/AirJourney。
