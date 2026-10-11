# 03 · 界面、视觉与交互规范

状态：已失效旧稿（未编号） · 目标：克制、清晰、以地球为视觉中心的 Windows 桌面体验。

## 1. 信息架构

一级页面：`Flights`、`Insights`、`Settings`；回收站位于 Settings 的 Data 区域。默认 Flights。地图在 Flights 主页面右侧常驻，避免添加后跳到另一页。Insights 旧稿 只需基本数字，不做复杂分析仪表盘。

```text
┌─ AirJourney ──────────────────────────────── window controls ─┐
│ Flights / Insights / Settings   │  [Show/Hide sidebar]        │
│ Search flights                 │                            │
│ Year · Airline · Airport       │       Interactive globe    │
│ 12 flights · 18,420.5 km        │         + routes           │
│ [Add flight]                   │                            │
│                                │        [Reset view]       │
│ Airline logo · Flight number   │        [+] [-]             │
│ PEK → LHR                      │                            │
│ Date · Duration · Distance     │  Route illustration         │
│ ...                            │  Data attribution          │
└────────────────────────────────┴────────────────────────────┘
```

示意仅用于结构说明，不是可交付视觉稿。实现阶段需提供实际截图和动效录屏。

## 2. 布局尺寸

- 标题区域 40–48 逻辑 px，遵循 Windows 的拖拽、最大化、系统菜单和关闭行为；窗口控件不被自定义按钮覆盖。
- 默认侧栏 360 px，可在 300–480 px 间拖动。地球占剩余宽度。1024 px 窗口时侧栏最多 360 px。
- 侧栏隐藏后地图铺满可用区域，左上保留独立 `Show sidebar` 控件；焦点转移到该控件。恢复宽度、滚动位置和选择；重启记忆隐藏状态。
- 编辑表单在侧栏内切换为滚动编辑面板，地球持续存在。布局紧凑时字段单列，日期与时区不被隐藏。
- 航班卡片 88–112 px 高，航空公司 Logo 区约 40×32 px；联盟 Logo 在详情或卡片次级位置显示，不争夺主路线注意力。
- 地图右下或底部保留可读的归属入口、必要审图信息和状态条；面板、航线浮层不得遮挡。

## 3. 视觉 token 初始基线

| token | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| Background | #F7F8FA | #111315 | 页面 |
| Surface | #FFFFFF | #1B1E22 | 卡片/表单 |
| Text primary | #17191C | #F0F2F5 | 主文字 |
| Text secondary | #5C626B | #A8AFB9 | 辅助文字 |
| Border | #DFE3E8 | #343940 | 分隔线 |
| Accent | #245FD6 | #8DB2FF | 主要操作/焦点 |
| Error | #B42318 | #FFB4AB | 错误 |

上述色值须由实现 Agent 用对比度工具验证，地图不同底色下航线需描边/光晕。正文、错误与控件不可仅凭视觉感觉验收。

间距采用 4/8/12/16/24/32 px；卡片圆角 10–12 px、面板 16 px；轻阴影，不用全页面磨砂遮住地球。透明背景需保证文字对比。界面图标采用一致的开放许可 SVG 图标库并登记版本；航空品牌 Logo 保持原始配色与比例，不随主题整体染色。

## 4. 排版

默认 Inter，fallback 使用系统 Segoe UI；用户输入中文可回退 Microsoft YaHei UI。字号：大标题 24/30、区域标题 18/24、正文 14/20、说明 12/18；字体重量 400/500/600。机场代码可 22–24 px，时间和统计数字启用等宽数字。避免全大写长段落。

不从 Apple/DeepSeek 网页提取字体文件；也不假设 DeepSeek 在每个平台都提供 San Francisco。Inter 随应用提供并保留 OFL 文件，不在启动时从外网拉字体。

## 5. 地球视觉

全球层级：深海蓝、柔和陆地自然色、真实海岸轮廓、低强度地形阴影、少量国家/地区标签。区域层级：地形细节渐进加载，机场点与航线清楚。无须 旧稿 加入建筑、街道、天气、航班实时动画、逼真机模。

航线默认统一强调色且带浅/深适配描边；选中高亮，其他线路降低透明度。航空公司配色作为后续可选模式，避免不同品牌色在海洋底图上不清晰。机场标记尺寸按屏幕像素固定，标签优先显示选中与悬停项目。

线宽约 2 px，选中约 3–4 px。线路交汇处点击显示选择列表而非随机跳转。日期变更线和近极区路线必须连续；背面路线不可穿透前半球造成错误视觉。拱高是示意参数，详情始终可见 `Route illustration`。

滚轮缩放、左键拖动旋转，明确手势提示；不要为 旧稿 依赖触控手势。`Reset view` 适配当前筛选航线；无记录回到全球总览。选择单个航班时相机适配起降机场，尊重 Reduce motion。默认不自动不停旋转。

底图地名要求英语，但不能因此破坏供应商规定的边界/归属信息。无法获得合法英语标注时记录阻塞项，不擅自擦去必要标注。

## 6. 表单与英语文案

| 位置 | 文案 |
| --- | --- |
| 一级菜单 | Flights / Insights / Settings |
| 空状态 | Your journeys start here. / Add your first flight |
| 操作 | Add flight / Edit flight / Save flight / Cancel / Delete flight |
| 航司 | Operating airline / Marketing airline (optional) |
| 机场 | Departure airport / Arrival airport |
| 时间 | Departure (local time) / Arrival (local time) / Time zone |
| 机型 | Aircraft type / Unknown / Custom |
| 距离 | Calculated distance / Recorded distance (optional) |
| 联盟 | Alliance at flight date / Current alliance / No alliance / Unknown at flight date |
| 地图 | Show sidebar / Hide sidebar / Reset view / Route illustration |
| 时间错误 | Arrival must be later than departure after time zone conversion. |
| DST 缺失 | This local time does not exist due to a daylight saving time change. |
| DST 重复 | This local time occurs twice. Select the UTC offset. |
| 网络状态 | Map details are unavailable. Your flights are still available offline. |
| 重复提醒 | A similar flight already exists. Save another record? |
| 删除确认 | Move this flight to Trash? / You can restore it for 30 days. |
| 未保存 | Discard your changes? / Keep editing / Discard |
| 备份 | Export backup / Import backup / Export CSV / Restore |

系统提供的枚举、默认数据名称、校验消息和屏幕阅读器 label 使用英语；法规要求必须原样显示的归属/许可文字作为来源信息例外。地图/品牌正式名称不擅自翻译。日期输入需显示年份，分别显示机场时区缩写及明确 UTC offset，不能只写 CST。

机场搜索候选格式：`PEK · Beijing Capital International Airport`，次行城市、国家/地区与必要 ICAO 标识。无 IATA 时使用核验 ICAO 或明确本地标识，避免空白误导。

## 7. 状态与可访问性

必须绘制：空数据、正常列表、编辑、新增、校验错误、保存失败、筛选无结果、地图下载中、离线、GPU 失败、导入预览/错误、回收站、Logo 暂缺。Logo 暂缺只用于开发/自定义实体，正式支持目录不以此通过最终验收。

快捷键：Ctrl+N 添加、Ctrl+F 搜索、Ctrl+B 侧栏、Esc 关闭浮层；Ctrl+S 在编辑面板保存。输入时不触发地图键盘动作；快捷键可在 Settings 查看。

Tab 顺序符合视觉顺序，隐藏侧栏不留不可见焦点元素。弹窗捕获焦点且关闭后回到原触发器；错误同时有文字、图标和字段关联。屏幕阅读器可通过列表获取机场、航线及统计，地图 canvas 不承担唯一信息入口。

动效 150–250 ms，相机转场不超过约 700 ms；Reduce motion 关闭空间飞行动效。用户正在输入时地图更新不能夺走焦点。

