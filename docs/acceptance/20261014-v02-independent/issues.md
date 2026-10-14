# v0.2 独立问题清单

按修复优先级：V02-N02 P1 → V02-N01 P2 → 近邻标签P3优化。本轮未修产品代码。

## V02-N02 · P1 · 正常操作中Cesium停止渲染（偶发）

- 已观察路径：在正常v0.2独立库保存BOM→NBO，再导入data/test-library.json并新建acceptance-city-approx→VABB，保存约13.8km航段；地球显示错误并停止绘制。重启后近路线可以显示；后续切换/编辑/取消等普通操作中又记录同错误。再一次新进程三轮长短航段切换/编辑保存未触发，**目前没有确定的每次必现最小步骤**。
- 预期：有效机场/城市近似坐标应正常展示，普通录入/选择不会使整个地图停止。
- 实际：DeveloperError: Expected width to be greater than 0, actual value was 0；Cesium显示Rendering has stopped。捕获时画布实际2084×1726、client1042×863，DPR2，不是截图时画布尺寸零。列表/数据保存/导出仍可用；重启恢复。
- 影响：地球和地图联动核心能力在该进程停止，用户需要重启；未观察记录丢失。按当前标准阻断完整通过。
- 证据：screenshots/09-approximate-route.png、14-render-stopped.png；logs/render-error.json完整栈；logs/render-transition-observed-error.json再次记录错误；logs/render-transition-results.json如实记录最后三轮无错误；screenshots/15-restarted-near-route.png证明重启可恢复。
- 定位/修复方向：栈落在Cesium Texture→FramebufferManager→GlobeDepth.update。检查地图视口/布局及实体异步更新期间的零尺寸framebuffer创建、重建绘制时序；增加合理的零尺寸帧跳过和异常后恢复/重建地图入口。**尚未锁定根因，不能推定是近似坐标、短距离或GPU本身错误**。
- 复测条件：使用独立构造库，正常模式从长路线切到近邻机场/城市近似路线，新增/编辑/取消、侧栏收放、常规窗口切换和重启；重复并监听renderError及实际截图，不依赖实体存在或保存状态断言。所有坐标与记录保留，不再停止绘制。补测初次未完成的空库恢复后地图。

## V02-N01 · P2 · Library坐标修改后仍标旧机场来源

- 复现一：Library→Airports搜索VABB，原纬度19.088699；仅将Latitude改19.2，Apply to future selections；新建航班搜索VABB并展开Location & codes。
- 预期：修改的坐标标明User location / User entered coordinates，或提示用户确认新的类型及来源；不继续把新值归于旧来源坐标。
- 实际：纬度19.2已保存/新选择生效，但locationKind仍airport、locationSource仍OurAirports airport coordinates，source仅改User edited。原航班快照正确保留19.088699，没有静默改历史。
- 复现二：新增自定义机场名称，手输Latitude=1、Longitude=2，不选Location type直接保存；列表显示Airport coordinates，持久对象没有locationKind。航班表单坐标手输会自动标manual，两个入口行为不一致。
- 影响：位置来源和人工/来源机场坐标的区分失真，影响本版重点透明性；用户能手动改类型/来源，未造成记录丢失，不单独阻断基本闭环。
- 证据：logs/provenance-results.json、ui-bugs-results.json；screenshots/05-library-coordinate-edit.png、06-new-choice-stale-provenance.png、07-new-manual-labeled-airport.png；Library.tsx坐标patch未同步元数据。
- 修复方向：坐标输入统一更新manual及人工来源；显式城市近似意图需保留/在提交时确认；清坐标同步unlocated。不要因只改名称就改坐标来源。
- 复测条件：全局资料与新建个人资料的键入/选点/清空，明确近似类型及来源、未来选择、原历史快照不变、CSV/备份/重启标识一致。

## P3体验建议（非新增阻断bug）

近邻机场BOM与≈ACCA在区域视图文字重叠，见screenshots/15-restarted-near-route.png。可增加标签避让、选中优先或重合点聚合。此类密集标签限制已在实现已知问题披露；不作为渲染停止的根因或阻断。另建议搜索提供机场类型/运营状态筛选，保持现有全部类型可查。
