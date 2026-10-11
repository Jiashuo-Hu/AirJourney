# 03 · 操作界面与自定义体验

基线：v0.0 · 英语产品 UI，中文设计说明。

## 1. 主页面与入口

一级导航：Flights、Library、Insights、Settings。默认 Flights，左侧负责记录与编辑，右侧地球常驻。Library 负责自己维护基础资料，不能藏在配置文件中让用户手改。

```text
┌ AirJourney ──────────────────────────────── Window controls ┐
│ Flights · Library · Insights · Settings                      │
├─────────────────────────┬───────────────────────────────────┤
│ [Search flights]        │ [Show / Hide sidebar]              │
│ Filters  [Add flight]   │                                   │
│ 12 flights · 10 mapped  │        Local interactive globe    │
│ Airline SVG · AJ001     │        Airport markers + arcs     │
│ PEK → LHR              │                                   │
│ Date · Type · Distance  │                       [Reset view]│
│ ...                     │                        [+] [-]    │
│ 2 need location         │ Route illustration · Sources      │
└─────────────────────────┴───────────────────────────────────┘
```

尺寸基线：标题 40–48 logical px；侧栏默认 360，可调 300–480；最小窗口 1024×720，按有效宽度限制最大侧栏以保留地图；单卡片约 96 px。隐藏时地图铺满，左上独立 Show sidebar 始终可达，保留草稿、选择、滚动与宽度。

编辑使用侧栏内面板或适合宽度的 drawer，右侧地球继续可见；大表单可滚动，Save flight 固定可达。开窗/最大化/拖动仍符合 Windows 行为。

## 2. Add flight：快速录入、逐步完善

表单前区：Departure、Arrival、Airline、Flight number、Departure date/time、Arrival date/time。后区折叠为 More details：Aircraft、Recorded distance、Duration override、Status、Tags、Notes、Custom fields、Route style。

机场输入同时支持搜索和文本。匹配候选时显式点击选取，不因打完类似代码自动替换用户文字。候选格式 `PEK · Beijing Capital International Airport`，次行 City · Region；没有官方代码就显示名称/用户别名，绝不填假代码。

没有匹配：显示 Add custom airport，打开内嵌小表单 Name / Code (optional) / Coordinates (optional) / Time zone (optional)。可 Save and use，也可 Save without location。用户可以在机场编辑里输入经纬度或打开 Pick on globe 进行选点，所选 WGS84 坐标带预览和 Confirm location；不联网地理编码。

每个日期/时间区域有 Unknown / Date only / Date and time 选择。IANA 时区可本地搜索，或 Use UTC offset；偏移明确显示 UTC+08:00 等，不仅写 CST。未知和问题时间显示小徽标，不用覆盖整个页面的错误弹窗阻止其他字段。

未知机型是默认可选项；航司可 Unknown；航班号可任何文本。用户改航班号时不触发时刻表查询、自动改航司或自动填时间。

保存后的反馈：已定位记录出现路线并轻量定位相机；没有定位显示 Flight saved. Add airport coordinates to show its route.，提供 Edit location。无需等待网络状态。

## 3. Library：自己的资料库

子页 Airports、Airlines、Alliances、Aircraft。每页有 Search、Add new、Import、Export、Show hidden；实体详情显示来源类型 Bundled / User edited / Custom 与编辑按钮。

| 实体 | 编辑内容 | 首版入口 |
| --- | --- | --- |
| Airport | 名称、城市、地域展示名、别名、可选 IATA/ICAO/用户代码、坐标、时区 | 输入坐标/Pick on globe/清除定位 |
| Airline | 名称、别名、可选代码、联盟、SVG、可选显示色 | Choose SVG / Preview / Remove logo |
| Alliance | 英语名、别名、SVG | Add alliance / 关联航司 |
| Aircraft | 制造商、家族、型号、可选标准 type code | 自定义型号和 Unknown |

编辑机场坐标、时区、名称或航司关系时显示 Used by N flights。默认 Apply to future selections；另一按钮 Review changes to existing flights 展示旧值/新值、记录数、地图/距离影响并要求确认。单个航班也可改快照，不强迫所有历史记录跟随。

删除引用实体默认 Hide from choices；历史快照和路线保持。自定义实体删除前说明引用和资产影响；资产被引用时不得提前清除。Restore bundled values 恢复资料默认层，用户原值的影响经过预览。

Logo 无需按品牌网站搜索/联网下载；Choose SVG 从本地文件选择。非法 SVG 显示具体原因且保留原资源。黑色 Logo 在深色主题可用中性浅底板，不擅自改品牌颜色。

## 4. 外观和地图定制

| 入口 | 设置 | 默认/取值范围 |
| --- | --- | --- |
| Appearance | System/Light/Dark、accent color、density | 默认系统主题、中等密度；色值需可读 |
| Display | km/miles、24h/12h、日期格式 | km、24h、DD MMM YYYY |
| Map | route color/width/opacity、marker size、labels、available layers | 线宽 1–6 px、opacity 0.25–1、点大小受限；只应用实际已有图层 |
| Map | home view、remember last view、Reduce motion | 用户可保存相机位置、恢复 globe overview |
| Flight detail | single-flight color、Show on map | 覆盖全局；可 Reset to global style |
| Personal fields | 字段名、类型、顺序、隐藏、选项 | 文本/数字/日期/选择；类型和输入值按界面规则展示 |

自定义强调色若影响文字对比，UI 使用清楚的前景色并给出可读预览；不能为了自由度让 Save/Cancel 无法辨识。样式 Reset 只恢复样式，Restore all personal data 是另一项需要确认的操作，不能共用按钮。

自定义字段改变类型前先预览，保留旧值为归档数据或确认转换；删除定义默认隐藏并保留既存值，明确永久删除才清理。修改选项不破坏旧记录中的已选值，显示 Archived option。

## 5. 地球观感

Apple Maps 作为自然色、层级和舒适缩放的参照。首版采用本地带晕渲纹理的三维椭球，地形视觉来自影像的颜色/阴影；不宣称真正近距离山体高程。影像支持的清晰尺度以上限制近距离缩放，并显示 Map detail limit，防止无限放大模糊纹理。

全球自然色、深海蓝、平缓高光与阴影；国家/地区文字英语，机场标签按镜头距离选择显示。选中航段高亮、其他线降低透明度。线宽按屏幕像素，默认强调色加描边，夜间仍可读。

相同路线聚合弹出当前记录列表；机场点击列出进出记录；列表点选适配两个机场。跨国际日期变更线沿地球连续，不沿经纬度平面直线；远侧路线不可穿透球体混在正面。同机场环线仅为符号，不伪造航路。

Reset view 根据当前可显示航线总览，无线路回全球视图。主界面常有 Route illustration 标注；未定位和主动隐藏计数各自显示。草稿也可有路线，地图不依据航班是否真实存在决定绘图。

## 6. 视觉规范

正文 Inter 14/20，说明 12/18，分区标题 18/24，大标题 24/30；400/500/600 字重，统计与时间用 tabular numbers。默认 fallback 为 Segoe UI，中文个人内容使用系统中文字体。

浅色 background #F7F8FA、surface #FFFFFF、text #17191C、secondary #5C626B；深色 background #111315、surface #1B1E22、text #F0F2F5、secondary #A8AFB9；accent 默认 #245FD6 / #8DB2FF。色值只是初始方案，实际对比度验证后调整。

间距 4/8/12/16/24/32；卡片圆角 10–12 px，面板约 16 px，轻阴影。品牌 Logo 保持比例和配色，约 40×32 px 区域；联盟标志放详情和卡片次级位置。通用图标风格统一、来源可追溯。

## 7. 英语产品文案

| 场景 | 文案 |
| --- | --- |
| 空记录 | Your journeys, your way. / Add your first flight |
| 未知 | Unknown / Date only / Time needs review |
| 地点缺失 | Needs location / Add coordinates / Pick on globe |
| 机场自定义 | Add custom airport / Save without location |
| 自定义资料 | Add airline / Add alliance / Add aircraft type |
| Logo | Choose SVG / Remove logo / Preview logo |
| 时间说明 | Times are entered by you. / Duration is unavailable until times are resolved. |
| 地图 | Route illustration / Map detail limit / Show sidebar / Reset view |
| 记录 | Save flight / Duplicate flight / Move to Trash / Restore flight |
| 状态 | Recorded / Planned / Draft |
| 设置 | Appearance / Map / Personal fields / Data & backup |
| 资料变更 | Apply to future selections / Review changes to existing flights |
| 备份 | Export backup / Import backup / Export CSV |
| 保存反馈 | Flight saved. / Changes saved. |

用户可自定义任何语言的名称/备注；默认 UI、默认数据展示和无障碍 label 英语。必要来源文字原样显示例外。没有实时状态或网络检查的按钮，不出现 Fetch flight data 等超出范围的入口。

## 8. 细节与无障碍

Ctrl+N 添加、Ctrl+F 搜索、Ctrl+B 侧栏；编辑时 Ctrl+S 保存、Esc 关闭。关闭有改动表单提示 Keep editing / Discard。地图快捷操作不在文本输入时触发。

隐藏侧栏焦点移至 Show sidebar，隐藏元素不能继续 Tab。弹窗关闭回到触发按钮；字段问题有文字和关联；颜色不作为唯一状态提示。地图信息可通过列表等效获取；Reduce motion 关闭相机飞行与空间动效。

必须覆盖空库、完整记录、Unknown、待定位、时间待核对、Custom 资料、缺 Logo、导入预览/失败、保存失败、回收站、损坏地图资源/GPU 不可用。断网是正常使用环境，不应该显示“请联网后再试”的空地球。



