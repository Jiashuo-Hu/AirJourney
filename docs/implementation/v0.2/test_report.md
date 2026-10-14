> 初次 v0.2 交付记录（保留历史）。当前同版本更新以 [地图与位置策略说明](map-and-location-update/implementation_summary.md)、[最新测试](map-and-location-update/test_report.md) 和 [当前限制](map-and-location-update/known_issues.md) 为准。手工机场位置编辑/新增已撤销，原产物在 release/v0.2/before-map-location-update。

# v0.2 实现自测报告

日期：2026-10-14（Asia/Shanghai）。对象为实际本机安装版AirJourney.exe，产品v0.2、工程0.2.0；安装到项目隔离目录evidence/v0.2/installed-app。不是Vite网页替代，不操作默认个人数据库。此为实现自测，不代替独立v0.2验收。

## 结果与证据

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 原有及新增领域测试 | 28/28 PASS | evidence/v0.2/unit-tests-final.log |
| 机场/城市回退策略 | 5/5 PASS | evidence/v0.2/resource-tests.log；tests/test_airport_resources.py |
| TypeScript/Vite与NSIS | PASS | evidence/v0.2/build-final.log、package-final.log |
| 本机实际安装 | exit0，未签名 | evidence/v0.2/install-final.json |
| 既有安装版桌面回归 | 16/16 PASS | evidence/v0.2/installed-smoke/smoke-results.json |
| 本轮安装版专项 | 18/18 PASS，无记录的renderer错误 | evidence/v0.2/installed-regression-final4/results.json |
| v0.0/v0.1兼容和软件显示缩放 | 10/10 PASS | evidence/v0.2/upgrade-display/results.json |
| 源码/资源/安装版一致性 | 逐文件核对 | release/v0.2/package-verification.json |

专项覆盖IATA/ICAO/城市/国家/变音符号/多词搜索、鼠标和键盘选择、30个结果限制、60条分页、新全球机场选择/路线及未知时区、个人覆盖优先/原快照不变、Library跨类别草稿、近似城市来源和地图金色/≈、未知位置保存及已知端点标记、折叠组可达、新增编辑/标签/空精度、连续设置保存、侧栏与双向选择、实际UI完整备份及全量恢复、真实程序关闭重启。

既有16项回归包含复制、删除/恢复、未知资料、SVG、模拟写失败不污染数据库、资料future-only与显式snapshot更新、基础地球和最小布局等。自动化输入通过实际BrowserWindow，不声称硬件手势实测。

旧数据用明确的构造夹具tests/fixtures/v00-*与v01-*，复制原版本真实测试库和备份字节。分别逐对象比对原库加载、编辑保存与进程重启、旧备份完整恢复。库和备份可能来自不同测试时点，各自与其自身原JSON比较，不把两者强行视为同一状态；夹具不包含用户个人数据库。

四档100/150/200/300%使用Electron force-device-scale-factor及1024×720逻辑窗口，检查渲染比例、水平溢出与主要地图按钮边界。它们不是实际切换Windows DPI，也不是完整辅助技术验证。

## 静态数据与搜索

本地快照86,242条、247个国家/地区代码；ID/ident唯一、所有坐标对通过有限数值/范围校验。原始重复0行；共享IATA代码保留，不凭名称/code擅自合并。覆盖、类别和缺项在airports-global-manifest.json。原15条资料的覆盖不会丢掉新ICAO搜索别名，个人待定位项也不会因匹配基准被偷偷填坐标。

本快照来源坐标全部合法，未触发真实城市近似回退。5项资源测试验证机场坐标优先、同国家唯一城市回退、模糊/跨国/歧义拒绝及无效坐标不混合成部分坐标。UI近似/待定位用独立测试机场，明确不是实际机场新增资料，不混入随包基准。

evidence/v0.2/search-benchmark.json：完整索引构建约181.8ms；36次查询纯索引P95约28.5ms，返回条数最多30。范围是Node索引，不含完整UI绘制、目标设备或长时压力；安装版实际搜索/选择另由专项验证。

## 视觉核验与正常模式

screenshots中保存空页面、全球实际来源机场路线、近似示例、深浅主题、折叠设置、重启与四档软件比例。已实际查看主要截图：地图无大标题/重复计数/常驻说明，主入口与数据操作保留；近似点金色、标签“≈”，详情明确Approximate city location；待定位航段不画假路线。

专项最后以无AIRJOURNEY_SMOKE的正常模式启动，确认__ajTestGlobe不存在。选中路线后等待，改Clock，回到Flights静置5秒，不滚轮/拖动/scene.pick；06-static-before与07-static-after-clock截图中路线和箭头继续可见。此是上版V01-N01的具体静止Clock场景复测，不扩大为全部GPU/时序/风格组合都无问题。

## 开发中发现与修正

首次打包因本机npm不在PATH导致依赖树JSON为空，配置项目npm路径后成功，日志保留。第一次安装版检查发现旧起步资料覆盖基准后KJFK搜索不到，补充搜索元数据、保留用户名称/坐标并加测试；随后发现下拉Escape冒泡触发全局放弃草稿，阻止冒泡后重新打包、安装及全跑。早期失败输出保留，只采用final4及最终安装摘要。

新增全球用例初次把NZAA误认为不在15条起步目录，断言失败；它实际是旧AKL条目，改用NZWN后复跑。此为用例前置假设错误，不计产品缺陷。

## 未测项

真实触控板、真实系统DPI、屏幕阅读器全矩阵、低配/所有GPU、干净VM/跨用户安装、物理断网、完整升级卸载、跨机器恢复、真实断电、万条及长时压力、全部自定义资源/导入/字段组合及独立v0.2验收NOT RUN。限制见known_issues.md。没有进行本轮未要求的扩展审查；没有任何GitHub推送/PR/Release/上传。
