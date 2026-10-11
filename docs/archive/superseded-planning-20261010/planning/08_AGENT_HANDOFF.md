# 08 · 三个 Agent 的交接任务书

状态：已失效旧稿（未编号） · 本文供负责人复制；本次没有创建或向其他聊天发送任务。

## 1. 权责

| 角色 | 负责 | 不能替代 |
| --- | --- | --- |
| 计划 Agent（本次） | 文档基线、方案、规则、实现分阶段计划、验收标准 | 不写 App、构建项目或宣称产品已通过 |
| 实现 Agent（第二个） | 采集核验资源、编程、测试、构建、安装说明、修复 | 不替验收 Agent 给出最终独立通过结论 |
| 验收 Agent（第三个） | 独立测试、检查数据/资源与交付、出具缺陷报告 | 不静默修改实现或自行缩减需求 |
| 负责人 | 范围、付费资源、发布、重大取舍与最终接收 | Agent 不代为购买、承诺许可证或发布 |

## 2. 给实现 Agent 的完整任务

你是 AirJourney 的实现 Agent。项目全部目录位于 `C:/MyFile/Project/AirJourney`。请先阅读 `docs/planning/00_README.md`，再阅读 01–09 全部文档和 templates。计划文档中文；App 的默认界面、表单、菜单、错误及无障碍名称均为英语。用户输入备注可以任何语言。

实现一个 Windows 个人飞行旅程记录 App：左侧航班管理可隐藏，右侧真实可交互三维地球，支持航空公司/联盟真实 SVG Logo、机场/机型/双端当地时间/距离，绘制全部记录的示意航线。采用建议栈 Tauri 2 + React/TypeScript + CesiumJS + Rust/SQLite，先按 P0 核验；技术替换必须给出原因和实际证据，不能改变功能基线。

按 `06_IMPLEMENTATION_PLAN.md` 分阶段执行。先验证 Windows 安装包里的地图引擎、地图源/中国内地标准/英语标签、Logo 授权与覆盖、时区/距离边界。可自主完成已授权的本地编码、测试和可逆工作；付费采购、发布、减少用户核心要求等先提交具体方案给负责人。

不得下载 Apple San Francisco 字体并打包进 Windows App；默认用 Inter。不得将城市代码当机场；不得按国家猜时区；不得把当前联盟倒填历史；不得将社区数据说成官方 IATA 数据；不得把端点弧线称为真实飞行轨迹；不得把渲染引擎开源等同底图合法/标准合规。

所有数据/资源登记版本、来源、许可与 hash。目录和地图的缺口如实记录；有待验证的源不得记为完成。不要使用占位图片、固定地球截图或虚构标准代码满足验收。

你需要在 `docs/implementation` 提交：

1. feasibility.md：技术/地图/资产的实际验证及成本/覆盖差距。
2. architecture.md 与 decisions.md：最终选型、版本、数据结构、与计划差异。
3. requirements_traceability.csv：FR/BR/NFR 对应实现位置、测试和运行证据。
4. catalog_manifest、asset_registry、地图图层/坐标/表达核验记录和第三方 notices。
5. build_and_install.md：构建环境、安装、WebView2、运行时数据、升级/回滚。
6. data_recovery.md：JSON/CSV、恢复、损坏/磁盘不足处理与隐私。
7. test_report.md、screenshots/recordings、known_issues.md。
8. release candidate 安装包、版本和 SHA-256。

提交验收时给出实际通过与未通过项目，不写“所有要求完成”除非证据支持。第三个 Agent 的缺陷返回后负责修复并生成新 build。

## 3. 给验收 Agent 的完整任务

你是 AirJourney 的独立验收 Agent。项目位于 `C:/MyFile/Project/AirJourney`。先阅读 `docs/planning/00_README.md` 和 01–09，重点使用 `02_REQUIREMENTS.md`、`05_DATA_AND_ASSETS.md`、`07_ACCEPTANCE.md`，再检查实现 Agent 的 docs/implementation 与安装包。

固定应用版本/hash 和测试环境，独立复现 AC-01–AC-32。不要只信实现报告；检查双时区、DST、跨日期变更线、距离单位、同线路多航班、历史联盟、SVG 真矢量和许可、地图内地标准表达及英语标签、断网和备份恢复、真实 Windows 安装与 DPI。

测试素材均标记 Synthetic，期望值来自固定业务规则和独立 oracle，不从被测代码生成。每个未测/缺证据项目明确标为 NOT RUN/BLOCKED。没有完整地图/Logo 来源证据时不得判定通过。重点追踪用户最初四项要求，不因应用界面漂亮就忽略数据真实性与完整性。

只写验收记录和测试证据，不静默修改产品。发现缺陷提供环境、前置、步骤、期望/实际、严重度、对应需求及脱敏证据，回交实现 Agent。新 build 做失败用例与受影响回归。

在 `docs/acceptance` 提交按模板撰写的 report、AC 执行表、缺陷清单、性能原始记录、截图/录屏及覆盖结论。最终明确 PASS / FAIL / BLOCKED / CONDITIONAL 与未完成项目；全部 Must 满足才可给完整 PASS。你不负责未经负责人授权的公开发布。

## 4. 最小交接包与接收检查

计划→实现：本目录全部文件，无代码也不缺任务边界。实现→验收：冻结的安装包/hash + 实现文档/台账 + 最终需求差异 + 测试素材 + 已知问题。验收→负责人：明确结论、实际覆盖、开放缺陷和证据。

当前计划目录中的“模板”和“NOT RUN”不是已经执行的产品测试。后续 Agent 应复制模板到自己的目录填写，避免覆盖原计划基线。原始需求变更用有日期的决策记录追踪。

