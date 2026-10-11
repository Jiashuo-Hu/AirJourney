# 08 · Agent 交付说明

当前唯一有效基线与目标 App 版本：v0.0。此前旧稿不编号且已失效。当前版本不随内部阶段自动升级，后续迭代版本由负责人决定。

## 实现 Agent 的交付方式

建议一次性交付，由同一实现 Agent 按内部阶段连续完成：

| 阶段 | 工作 | 具体依据 |
| --- | --- | --- |
| S0 | 本地技术实验、离线地球与安装验证 | 10_EXPERIMENTS.md、04_ENGINEERING.md、05_DATA_AND_ASSETS.md |
| S1 | 本地记录、参考资料、计算与未知状态 | 02_REQUIREMENTS.md、04_ENGINEERING.md |
| S2 | 英语界面、侧栏与地图路线闭环 | 03_DESIGN.md、02_REQUIREMENTS.md |
| S3 | 资料/SVG管理、字段标签与视觉定制 | 03_DESIGN.md、04_ENGINEERING.md、05_DATA_AND_ASSETS.md |
| S4 | 细节打磨、备份恢复、自测和安装包 | 06_IMPLEMENTATION_PLAN.md、07_ACCEPTANCE.md |

阶段是内部执行顺序，不要求负责人逐阶段重新发送指令。直接复制 [实现 Agent 提示词](11_IMPLEMENTATION_PROMPT.md) 即可授权完成上述范围。所有阶段文档已具备，无需等待补写其他提示词。

## 重点阅读

首先阅读 [总览](00_README.md)。功能以 [需求](02_REQUIREMENTS.md) 为准，界面按 [设计](03_DESIGN.md)，架构按 [工程规格](04_ENGINEERING.md)，静态资源按 [资源方案](05_DATA_AND_ASSETS.md)，执行顺序按 [实施计划](06_IMPLEMENTATION_PLAN.md)。[实验文档](10_EXPERIMENTS.md) 用于验证，[验收文档](07_ACCEPTANCE.md) 用于自测覆盖与后续独立检查。

产品定位补充见 01_PRODUCT.md，决策与研究依据见 09_DECISIONS_AND_SOURCES.md，模板见 templates。docs/archive 仅供追溯，不合并其要求。

## 权责与交接

计划 Agent 交付文档；实现 Agent 完成工程、资源、自测、安装包及修复；验收 Agent 独立执行检查并出具结论。S5 是后续独立验收与缺陷修复，不要求实现 Agent代替第三个 Agent作独立结论。

实现产出位于 docs/implementation，验收产出位于 docs/acceptance。交接应包括冻结安装包/hash、实际资源清单、需求追踪、自测、已知问题及真实截图录屏。模板 NOT RUN 不代表已测试；未解决项不得冒充通过。


## 当前验收交付入口

实现 Agent 已提交 v0.0 可安装候选，独立验收使用 [验收 Agent 提示词](12_ACCEPTANCE_PROMPT.md)。实际架构和已知缺口以 docs/implementation 的说明与代码为检查对象；按07_ACCEPTANCE.md的当前基本功能标准判断；缺少图层或个别Logo如实列建议，不沿用旧审查阻断结论。

直接运行 release/win-unpacked/AirJourney.exe 时保留整个 win-unpacked 目录；安装使用 release/AirJourney-v0.0-x64-setup.exe。验收记录另存 docs/acceptance，测试使用隔离个人数据，避免污染用户实际记录。


## 当前验收交付

实现已交付v0.0候选。直接复制[验收Agent提示词](12_ACCEPTANCE_PROMPT.md)，按[当前功能验收计划](07_ACCEPTANCE.md)执行。本轮以基本功能可用为准；先前审查和全部Must硬门槛不继续沿用。第三个Agent只核验并提出修复/迭代建议，保留已有实现与报告。

