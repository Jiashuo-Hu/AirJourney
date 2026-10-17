# AirJourney · 全新规划基线 v0.0

最新实现迭代：负责人已指定v0.5 / 0.5.0，见[19_V0_5_SCOPE.md](19_V0_5_SCOPE.md)。保持机场资料完全只读；新增统计、年份回顾、颜色重置与侧栏过渡修正，适度优化体积。v0.5仅本地交付，报告位于docs/implementation/v0.5。v0.4后续GitHub同步是历史授权，不适用于本轮。下文保留原v0.0规划时点记录。

日期：2026-10-10（Asia/Shanghai） · 角色：计划 Agent · 当前状态：已交付 v0.0 可安装候选，等待独立验收。

版本从 v0.0 开始，当前需求基线与目标 App 均使用 v0.0。此前旧稿不编号；各实现阶段不自动升级版本，后续迭代由负责人确定新版本号。

## 产品定义

AirJourney 是高度自由、可自定义的 Windows 个人飞行旅程记录 App。用户手动提供航班号、起降机场、日期时间、航司、机型与其他信息；软件负责本地保存、编辑整理、界面呈现以及在三维地球上绘制机场间的示意路线。

**航班记录来自用户。机场、航空公司、联盟、Logo 和地图是本地参考资源。二者不是同一类数据。** 添加记录不查航班是否真实存在，不抓取历史航班，不查询实际运行时间，不依赖 ADS-B 或在线数据库。用户输入优先于参考默认值。

## 当前验收范围

负责人最新决定：只聚焦基本功能实现和体验。以07_ACCEPTANCE.md为最终验收依据，高级功能/极端测试与理想指标作为改进项。已撤出审查任务，不沿用历史报告中由这些任务产生的阻断结论。实现历史与已有证据保持原样，产品版本不变。

## 本版功能范围

- 日常录入、搜索、编辑、地球、字体、Logo、资源管理和备份，在安装完整本地资源后均可断网使用。
- 开发阶段可一次性获取适量静态资源；之后随包提供或由用户从本地导入。没有自动爬虫、定时联网更新或全世界航班数据库下载任务。
- 默认地图是可旋转缩放的三维椭球 + 本地自然色/地形晕渲影像 + 本地可用图层/英语地名 + 用户路线。地形颜色不要求真实山体高程模型、街道或建筑数据。
- 机场和航司采用实用起步目录并支持自由补充。目录覆盖不作为“用户是否能录入”的门槛。Logo 要求落在实际随包提供的品牌资源和用户本地导入资源上，不追求全球全部航司的穷尽采集。
- 界面与 App 默认产品字符串英语；工程交付文档中文。用户备注和自定义名称不限制语言。

v0.0 根据负责人最新指示重新起草，完整替代此前旧稿。旧 FR/BR/NFR/AC 编号及旧范围不再生效，即使编号重用也只按当前基线内容解释。旧文档保留在 `docs/archive/superseded-planning-20261010` 供追溯，后续 Agent 不得将其合并进当前任务。

## 文件索引

| 文档 | 用途 |
| --- | --- |
| [01_PRODUCT.md](01_PRODUCT.md) | 用户目标、首版范围、自由度与产品流程 |
| [02_REQUIREMENTS.md](02_REQUIREMENTS.md) | 功能和数据规则，区分硬要求与体验建议 |
| [03_DESIGN.md](03_DESIGN.md) | 英语界面、侧栏地球布局、自定义入口与细节 |
| [04_ENGINEERING.md](04_ENGINEERING.md) | 本地架构、领域模型、数据恢复和离线工程 |
| [05_DATA_AND_ASSETS.md](05_DATA_AND_ASSETS.md) | 小规模静态资源、本地地图、Logo 与可编辑资料库 |
| [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md) | 软件实现步骤及每阶段交付 |
| [07_ACCEPTANCE.md](07_ACCEPTANCE.md) | 以基本功能可用为标准的独立验收 |
| [08_AGENT_HANDOFF.md](08_AGENT_HANDOFF.md) | 给实现和验收 Agent 的可直接复制任务书 |
| [09_DECISIONS_AND_SOURCES.md](09_DECISIONS_AND_SOURCES.md) | 最新研究依据、取舍与有限未决项 |
| [10_EXPERIMENTS.md](10_EXPERIMENTS.md) | 技术实验计划：离线地球、资源与交互验证 |
| [11_IMPLEMENTATION_PROMPT.md](11_IMPLEMENTATION_PROMPT.md) | 可直接交付实现 Agent 的精简提示词 |
| [12_ACCEPTANCE_PROMPT.md](12_ACCEPTANCE_PROMPT.md) | 可直接交付独立验收 Agent 的精简提示词 |
| [templates/README.md](templates/README.md) | 资源台账、执行追踪、实验和验收报告模板 |

## 核心交付判断

用户能够断网手动添加一条虚构或自定义航班，不被外部数据库缺失阻止；当起降机场坐标已知时，地图立即显示路线。名称/坐标未补全时仍可保存，界面明确说明待定位，而不是抹掉该记录。

自由定制必须有可见入口：Airports、Airlines、Alliances、Aircraft、Appearance、Map style；包括名称、坐标、时区、品牌 SVG、标签和显示设置。输入不完整的记录仍可管理，不伪造缺失时间、距离或地点。

## 计划阶段产出与当前交接

计划 Agent 提供规划与交付文档，不承担软件实现或独立验收。实现 Agent 已提交可安装候选，实际采用 Electron、React/TypeScript、CesiumJS 和 SQLite WASM，具体差异、自测及未完成项见 `docs/implementation`。全部项目文件位于 `C:/MyFile/Project/AirJourney`；当前交接使用 12_ACCEPTANCE_PROMPT.md，完整产品是否通过由独立验收确认。




