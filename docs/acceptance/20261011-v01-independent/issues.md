# v0.1 新问题与复测条件

无开放P0/P1。以下为1项P2功能bug和2项P3视觉/交互不足；均未修产品代码。优先级顺序N01→N02→N03。旧AF-01–AF-05本轮复测通过。

## V01-N01 · P2 · 保存普通设置后航线在静止地图上消失

- 复现：新建PVG→HND并保存；选中记录看见近地路线；Settings→Appearance将Clock从24h改12h；返回Flights，等待至少2.5秒，不移动相机。再轻微滚动地图。
- 预期：时钟格式变更不改变路线，返回列表时航线持续可见。
- 实际：机场点/标签仍在，mapped=1，航线与方向段消失；滚轮轻微缩放后重新出现。测试模式两次相同结果；正常发布模式再次复现，`testingHook=false`、3条记录完整。编辑保存/主题切换中也观察到类似现象，确定性复现以Clock步骤为准。
- 影响：地图与已保存记录的可见反馈暂时不一致，用户可能误认为路线被删除；缩放可恢复，记录未丢，不阻断基本闭环。
- 证据：[设置后](screenshots/19-normal-route-missing.png)、[滚动后](screenshots/20-normal-route-reappeared.png)、[之前](screenshots/18-normal-route-visible.png)；logs/normal-route-check-results.json；两次补充logs/route-refresh-results.json及11/12系列截图。
- 定位/修复方向：Globe.tsx以requestRenderMode和无限maximumRenderTimeChange工作；依赖整个settings重建所有实体后仅请求一次绘制。**怀疑**异步polyline准备完成没有继续请求帧，非经修复验证的确定根因。检查primitive/dataSource就绪后绘制调度，按实际地图依赖更新，避免Clock/主题等无关设置清空实体；不要仅检查entity count。
- 复测：同一相机、无滚动/拖动/scene.pick辅助，在改时钟、主题、单位、路线样式和编辑保存后分别静置5秒，截图保持路线/箭头、选择命中正确；记忆视角开关也回归，写失败不影响数据。

## V01-N02 · P3 · 地图装饰文案在浅色陆地上对比不足

- 复现：选中PVG→HND使地图放大到区域视图，在Light和Dark分别看地图左上及底部。
- 预期：标题、副标题、来源/说明均可轻松阅读，不依赖当前底图颜色。
- 实际：主标题尚可辨，小号YOUR WORLD, CONNECTED / Local globe…及底部说明在浅色陆地/蓝色海面上明显淡；侧栏和机场标签底板清晰。深浅主题不改变这段底图上的问题。
- 影响：装饰与辅助说明难读，主要入口、地名和机场代码仍可用；非核心视觉不足。
- 证据：screenshots/02-route-light.png、04-route-dark.png、19-normal-route-missing.png；src/style.css的globe-heading固定浅色文案。
- 修复方向：加半透明底板/渐变遮罩，提高小字对比，或有记录时折叠大标题；维持地图控件与机场标签现有高对比样式。
- 复测：浅色陆地、海面、全局黑背景各检查Light/Dark；常用窗口宽度下说明可读、不挡机场与路线，标题可隐藏。

## V01-N03 · P3 · 资料草稿切换类别直接消失

- 复现：Library→Airports→Add new；Name输入UNSAVED-LIBRARY-DRAFT；未提交，切Airlines再回Airports。
- 预期：保留草稿，或在离开前提示确认放弃，行为与航班编辑草稿一致。
- 实际：编辑面板关闭，输入消失，无提醒；该名字没有保存入库。主Flights页面切换则能保留未保存航班草稿。
- 影响：用户需要重录未提交的资料内容；没有丢失已保存记录，作为非核心交互不足，不升级为数据丢失阻断。
- 证据：screenshots/14-library-unsaved.png、15-library-draft-gone.png；logs/library-draft-results.json；Library.tsx类别按钮setEdit(null)。
- 修复方向：按类别保存草稿，或者dirty时统一调用放弃确认；同时检查关闭面板/切主页面的同类路径。
- 复测：新增与编辑资料均覆盖四类切页，取消离开时原输入保留，确认放弃才清空，不污染已保存目录。
