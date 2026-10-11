# v0.0 本地架构

前端：React 19.1.1 / TypeScript 5.9.2 / Vite 7.1.7。地球：CesiumJS 1.133.0 的 CesiumWidget，单实例。壳：Electron 38.2.0（Chromium/Node 实际版本见测试 runtime 证据）。SQLite：sql.js 1.13.0，主进程加载本地 WASM。测地线：geographiclib-geodesic 2.2.0；时间：moment-timezone 0.6.0，完整本地规则；ZIP：fflate 0.8.2。依赖版本与完整 integrity 在 package-lock.json。

## 边界

`desktop/preload.cjs` 只暴露 load/save、用户文件选择、用户导出和数据路径。渲染进程没有 Node 集成，启用 contextIsolation / sandbox。主进程处理 SQLite 与文件。生产没有本地 HTTP 服务，使用 `airjourney://app/` 白名单协议，目录规范化后必须位于打包的 dist 下。

全局禁用后台网络和 component update；session 拒绝外部请求；CSP 的 connect-src 仅 self，禁 object/frame。使用本地 CesiumWidget 替代依赖 Knockout 字符串执行的 Viewer；**JavaScript unsafe-eval 保持禁止**。仅允许依赖内置 WASM 编译所需的 wasm-unsafe-eval。最初放宽整个 CSP 的请求被自动审批拒绝，已改用上述更窄方案并通过 CSP 断言。

## 数据契约

schema=1；Flight UUID 与原始字段独立。两端 Place、airline、aircraft、alliance SVG 等在录入时复制到快照，后续 Library 不默认改历史。人工修改机场名字成为独立自定义地点，避免隐式覆盖原库。资料明确批量应用前列出记录 ID 和字段变化；手工距离、时区原输入、单段联盟覆盖保留。

未知时间保存空字符串，没有补午夜；未知坐标使用缺失属性，合法 0 保留。有完整本地时间与时区才解析 UTC，重复/缺失 DST 保持 unresolved。到达 UTC 不晚于出发不输出时长。日期、非负数字、坐标范围和导入结构均验证。WGS84 geodesic 距离与拱高无关；同坐标显示符号环线而非实际航迹。

数据库位于 `%LOCALAPPDATA%/AirJourney/airjourney.sqlite`。SQLite state 表保存完整状态，PRAGMA user_version=1；不支持的版本拒绝。提交在复制出的 SQLite 实例中事务完成，导出 pending 文件并 fsync，保存 previous 文件后 rename 替换，成功后才更新 UI。损坏库不静默重建。异常留原库及草稿。没有清理个人资源的后台任务。

## 资产

随包地图、字体、Workers 等在 dist；个人 SVG 和个人地图以经过检查的数据 URL 嵌入状态，历史快照自身持有旧 SVG 内容，不会因 Library 替换而失效。备份 data.json 同时携带这些资产，避免绝对路径依赖。每个 SVG 要有 viewBox/矢量形状；拒绝脚本、事件、foreignObject、image、外部 href/CSS URL、动画和 DTD；浏览器同时验证 XML 元素白名单。

默认 4K 单图、2K 同源备用图；WGS84 椭球；不启用 ion、geocoder、在线 terrain / basemap。地球影像为自然色晕渲，不宣称高程网格。最小交互缩放约 1,500 km 相机高度；线路聚合按无方向端点 ID 对，选中记录决定方向。缺坐标不创建点/线，统计单列待定位/手工隐藏。GPU 错误保留记录管理。

`AIRJOURNEY_TEST_DIR` / `AIRJOURNEY_SMOKE` 仅供明确的本应用测试，使用独立测试目录、确定性文件对话替代和 renderer diagnostics。普通启动没有测试注入。安装测试也使用独立目录，不操作真实个人库。
