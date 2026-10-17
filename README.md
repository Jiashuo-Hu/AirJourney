# AirJourney v0.5

Windows个人飞行记录App，英语界面，正常使用完全本地。用户手动记录航班，三维地球绘制机场间示意路线；不查航班真实性、历史实际轨迹或实时信息。

产品v0.5 / 工程0.5.0，当前范围见[19_V0_5_SCOPE](docs/planning/19_V0_5_SCOPE.md)。新增紧凑个人统计、按出发地当地年份回顾、默认路线颜色重置与对比高亮、侧栏连续尺寸调整；统一统计代码、延后加载地球、无损压缩目录及精简生产SQLite构建。保留旧资料和功能，无删除机场或降低地图/Logo清晰度。

- Recorded按已完成统计；Planned、Draft单独显示，垃圾箱排除。人工里程（含零）优先，否则采用已有地理估算，缺失不编造。机场/航司去重，往返路线合组，重复航班仍各自计数，详细口径可在Counting details查看。
- All和已有年份按出发地当地日期归年，未注明日期只在All；和已有筛选共同生效，同步列表、地图与统计。新增、编辑和删除即时更新年份。
- 保留86,242条机场、7,764条航司、115家完整矢量标志（92独立图形、23文字回退），Spring继续占位。机场资料只读，不能新增或修改；其他个人资料、SVG、标签、字段、历史引用和完整备份恢复保持。

本地交付：release/v0.5/AirJourney-v0.5-x64-setup.exe、AirJourney-v0.5-source.zip；校验值与清单在同目录。详见[实现说明](docs/implementation/v0.5/implementation_summary.md)、[测试报告](docs/implementation/v0.5/test_report.md)、[性能与体积](docs/implementation/v0.5/performance.md)、[构建安装与备份](docs/implementation/v0.5/build_and_install.md)、[已知限制](docs/implementation/v0.5/known_issues.md)、[需求追踪](docs/implementation/v0.5/requirements_traceability.csv)。

v0.5于2026-10-16完成本地候选交付；2026-10-17用户另行授权整理文档并同步GitHub。此次上传源码、静态资源与文档，不创建PR或Release，不上传安装附件，详见[同步说明](docs/implementation/github_sync_v0.5.md)。[独立后台验收](docs/acceptance/20261017-v05-background/report.md)在本轮后台功能范围内通过，不等同前台及全部设备验收。测试只使用隐藏离屏窗口与合成隔离资料，不操作用户鼠标键盘或抢占焦点；无法后台确认的视觉/设备效果明确待人工确认，自测不代替独立验收。v0.4历史同步说明见[原记录](docs/implementation/github_sync_v0.4.md)，更新历史见[update_log.txt](update_log.txt)。

```powershell
npm ci --no-audit --no-fund
npm test
npm run build
npm run package
```

Node24或兼容22.12+、Windows x64。等待构建完成再打包；用户运行不需要开发环境或联网。构建后目录使用本地gzip存储，运行时无损还原全部原记录，源码public仍保留原JSON。

代码MIT；数据及品牌版权商标另计，未授予通用商业使用许可。资源[来源和限制](public/notices/Airline-data-and-brands.txt)、[品牌清单](public/logos/airlines/manifest.json)、[覆盖与缺项](public/data/airline-sources/v04-coverage.json)均保留。不将免费下载视为无版权限制，不宣称品牌全部最新。
