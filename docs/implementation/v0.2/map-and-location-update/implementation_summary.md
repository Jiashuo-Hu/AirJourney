# v0.2 地图与位置策略更新

依据最新用户指令及16号补充范围，仍为v0.2/0.2.0，只做本地交付。原v0.2交付与独立报告保留；原二进制/源码/摘要保存在release/v0.2/before-map-location-update，根目录release/v0.2是当前更新。

## 渲染停止处理

原独立报告捕获Texture→FramebufferManager→GlobeDepth.update中的零宽错误，当时CSS/画布尺寸却正常，因此不能单凭截图判定布局宽度零，也没有确定每次必现的触发条件。

采用CesiumWidget公开的手动render/resize接口；正尺寸稳定后才resize，在每次render之前检查真实WebGL drawingBufferWidth/Height及isContextLost，而非仅检查canvas.width。CSS视口或真实GPU缓冲区无效则跳帧；缓冲区长期空白或上下文丢失进入恢复。

减少GPU分配：保留正常DPR，绘制缓冲区最多约4百万像素/单边4096，独立MSAA targets用1 sample，保留WebGL context抗锯齿。国家/机场文字改为HTML叠加层，避免依赖GPU文字图集，也独立保持字体清晰。高DPR窗口可能触发影像分辨率上限，不要求GL像素比在所有尺寸都等于DPR。

错误时记录诊断、保留相机和全部数据，自动重建地图（30秒内最多两次），不重启App、不重新写数据库；持续故障显示Restart map，同一进程可重试。释放旧实例资源和WebGL context，防止反复重建积累上下文；销毁后异步影像回调不再改动新地图。控件菜单也有Restart map。

依据：[CesiumWidget公开API](https://cesium.com/learn/cesiumjs/ref-doc/CesiumWidget.html)；[上游类似错误](https://github.com/CesiumGS/cesium/issues/12517)、[上下文释放讨论](https://github.com/CesiumGS/cesium/issues/11533)。上游案例不证明本项目一定是相同根因；本次是明确的零尺寸/上下文保护与故障恢复，不宣称所有GPU问题根治。

## 悬停与国家标签

航线仍按给定坐标立即绘制。默认不显示机场名称/代码；鼠标悬停可见航线（含端点下方的线）时显示两端已有IATA或历史已提供的三字代码，离开后隐藏。不伪造不存在的IATA，没有三字代码时不拿长名字/ICAO冒充。

按实际DOM宽高和投影位置检查国家名称重叠，优先显示主要国家。当前是18个精选国家锚点，不宣称全球全部国家标签。近邻机场代码也做小幅位置避让；文字以时间插值渐显/渐隐，Reduce motion时立即切换。默认Map labels开关继续允许用户关闭文字。

## 固定机场位置

取消航班表单自由机场名称/经纬度/类型/来源输入和Pick on globe，显示只读Airport information。Airports的手工新增、选点、清位置、经纬度及位置类型输入取消；已有资料仍可编辑名称、别名、时区等非位置元数据，其他资料类别仍能新增/修改。

新增航班从给定目录选择，坐标及位置来源取该目录；用户原名称/别名可以保留。应用保存队列拒绝新增或改变位置，机场资料导入只更新已知机场的元数据，变动坐标或未知位置拒绝。所有机场位置类型/来源随只读坐标保留，不再产生“手改坐标还归于旧来源”的新路径。

历史航班、已有个人资料和旧备份保留原坐标，不自动改到最新目录位置。历史备份恢复是恢复先前给定内容，恢复后仍只读；并非新的位置编辑工具。已有记录可显式重选给定机场。Unassigned Draft仍可保存。无法手动补充目录之外的新机场，这是此次用户明确要求带来的范围变化。

## 测试范围

见test_report.md。故障注入用例与自然操作回归分开记录。原始偶发问题未建立稳定最小复现；重复回归无自然停止，不等同所有硬件/长时间场景都证明无缺陷。没有GitHub推送/PR/Release/上传。
