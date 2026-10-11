# AirJourney v0.1 本地实现候选

日期：2026-10-11（Asia/Shanghai）。依据 `docs/planning/13_V0_1_IMPLEMENTATION_PROMPT.md`、`suggestions/v0.0.txt` 及 AF-01–AF-05。沿用 Electron / React / TypeScript / CesiumJS / SQLite，包版本 0.1.0、显示 v0.1。没有任何 GitHub 推送、PR、Release 或产物上传。

## 本次改进

| 项目 | 具体实现 | 证据 |
| --- | --- | --- |
| 地图清晰度 | 从已有 10800×5400 本地 Natural Earth II 源制作 170 张 512px 瓦片，0–3 级，最高等效 8192×4096；约 12.2 MB。按窗口 devicePixelRatio 渲染，支持原有个人底图。 | public/maps/naturalearth/manifest.json；打包程序截图/结果 |
| 文字清晰度 | Inter 600、28px 字形以 0.5 倍显示；地名高对比描边，机场深色底板。可见半球判定继续隐藏背面标签。 | screenshots；软件显示缩放检查 |
| 缩放交互 | 保留按钮；滚轮及精密触控板 Ctrl+wheel 输入归一化；Cesium 双指 pinch；双击放大、Shift+双击缩小；英语操作提示。双击取消待处理单击；定位模式双击不缩放。 | 实际安装版的输入回归；真实触控板未测 |
| 航线 | 默认 4px，选中加 2px；轮廓和方向箭头；默认视觉抬升 12km 加 4km 基础间隔，约 16km 峰值。每段不超过约35km采样；可设置抬升 0–100km。WGS84 里程独立。 | 几何断言、实际 scene.pick、截图 |
| AF-01 | TimeSpec 新增可选 precision，保存空记录的精度意图；降为 Date only 清时刻，Unknown 清日期/时刻；不编造值。旧 schema 1 按已有值推断显示。 | 领域/界面/重启/备份回归 |
| AF-02 | 保留输入原文与末尾逗号；保存数据按逗号解析、trim、去重，失焦时规范化显示；支持中文与空格。 | 逐字符输入、保存和重启 |
| AF-03 | 队列保存 StateMutation，执行时读取最新成功状态；失败不发布，后续任务仍继续。设置、字段、资料、航班、视角与备份合并采用相同策略；导出备份先等待队列完成。 | 延迟/失败领域测试，同轮设置/滑块回归 |
| AF-04 | 导入预览绑定 kind+entries，确认及冲突判断始终使用绑定类别；切页保留明确目标，取消不改库。 | 四类分别跨页确认、取消及保留/替换冲突 |
| AF-05 | 源码 ZIP 包含最新规划（含13号提示词）、独立报告/缺陷清单和本次文档；逐文件摘要与当前工作区核对，安装 ASAR 与当前 dist/desktop 核对。 | package-verification.json |

## 保留用户值与兼容性

数据库及便携备份保持 schema 1。precision 和 routeHeight 为可选字段；旧资料、快照、SVG、标签和设置不重写。v0.0 已保存的线宽原样保留（可能为2px），新库或 Reset map style 使用4px；不把既有用户样式静默升级。视觉高度不参与距离、时区或时长。

原 v0.0 产物、历史报告及验收证据保留。v0.1 安装包、源码 ZIP、SHA-256 和外部交付清单在 `release/v0.1/`；源码包内文档与本次工作区一致。自身 ZIP hash 放在包外清单，避免自引用；不是沿用旧文档快照。

## 实际发现并修复的视觉问题

第一轮降低高度后，数值测试虽通过，真实截图却显示航线被地形深度噪声遮住。该 App 只有椭球影像，现采用 Cesium 的椭球遮挡策略（depthTestAgainstTerrain=false）：近地线保持可见，远侧仍由球体遮挡。方向箭头单独多500m间隔，避免与主体重叠闪烁。最终可见性用实际 scene.pick 和截图核验，不仅检查实体存在。

## 验收范围

本轮为实现 Agent 自测，独立 v0.1 验收仍待执行。执行范围是基本功能与具体改进，没有开展通信权限、网络安全、文件路径安全或地图边界审查。详细执行/未测状态见 test_report.md、known_issues.md、requirements_traceability.csv。
