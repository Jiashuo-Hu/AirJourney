# v0.1 实现自测报告

日期：2026-10-11（Asia/Shanghai）。实际 App 工程版本0.1.0，安装包版本v0.1。此为实现 Agent 的自测，不代替独立 v0.1 验收。

## 复现与修复

先实际启动原 v0.0 解包程序，使用隔离 profile 复现 AF-01/02/03/04：选择 Date and time 回到Unknown、alpha,变alpha、同轮 Dark/km变Light/km、机场预览切航司后落入Airlines。原始结果：evidence/v0.1/baseline/observations.json。初次测试工具定位Theme label过严而超时，修正工具后得到四项复现；不把工具超时算产品缺陷。

最终已修复上述四项P2，AF-05通过源码ZIP逐文件/最新规划摘要核对确认。对应代码与结果在requirements_traceability.csv、self_test_results.csv和package-verification.json。

## 测试与实际安装

- `npm test`：20/20领域断言通过，包括原14项及新增精度、标签、状态队列延迟/失败、旧schema和近地路线回归。日志：evidence/v0.1/unit-tests.log。
- TypeScript/Vite构建及NSIS成功：evidence/v0.1/build.log、package.log。实际本机安装成功（exit0）；NotSigned；证据install.json。
- 最终安装程序的既有桌面回归：16/16，evidence/v0.1/installed-smoke/smoke-results.json。新增/编辑/复制、未知资料、侧栏草稿、删除恢复、写失败、SVG/资料快照、备份、列表/地球双向选择和最小窗口仍可用。
- 最终安装程序针对本轮修改：25/25，evidence/v0.1/installed-regression-final/results.json，无记录的renderer错误。时间精度两端/空值/升降/保存重启；标签逐字符/尾逗号/中文/重复/整串/清空/搜索；同轮主题/单位和多个滑块；四类导入跨页确认、取消、保留/替换冲突；地图比例/本地瓦片/文字；滚轮、双击及合成触控；近地线实际可点选与背面遮挡；真实程序关闭重开与备份逐对象一致。
- 兼容性与软件显示缩放：7/7，evidence/v0.1/upgrade-display-final/results.json。原v0.0 SQLite逐对象原样加载，旧记录编辑/重启保留，原v0.0备份逐对象恢复；1024×720下100/150/200/300%四档软件渲染比率及主要按钮边界检查。纯合成夹具在tests/fixtures。

所有运行使用真正的安装版AirJourney.exe/ASAR及独立profile，不用Vite网页替代，不改默认个人数据库。最终安装包hash见release/v0.1/SHA256SUMS.txt，包内代码与当前dist/desktop核对一致。

## 真实渲染与输入证据

最终浅/深主题、区域路线、总览及高DPR截图在screenshots。最高等效8192×4096本地影像、28px/0.5字形、DPR渲染生效；样例路线4–16km高度、选中6px，11个采样位置在实际scene.pick命中，移到相反半球命中为0。里程仍由WGS84独立计算。

第一轮几何数值通过却未看见低路线，实际截图暴露地形深度噪声；修复后重新打包、安装并复测。第一次背面测试只旋转经度，没有把所有端点移到真实背面，导致1个命中；修正测试相机到相反方向后核验0命中，不把工具相机错误记成产品穿透缺陷。早期输出保留，最终报告只采用installed-regression-final。

滚轮、拖动与双击由Playwright/CDP送入实际BrowserWindow；Ctrl+wheel及双触点pinch为合成输入路径检查。**没有真实触控板硬件实测**。四档比例通过Electron force-device-scale-factor，不是实际修改Windows系统DPI。截图视觉核验和输入路径自测不能扩大为所有硬件/驱动都通过。

## 性能与未测项

最终安装版另做1000条短时观察：30次搜索P95约85.3ms，30次直接IPC SQLite提交P95约33.2ms，5秒交互中位约40fps。GPU进程工作集快照约1.31GiB，渲染进程约494MiB；这是本机短时采样，未证明长时内存稳定。详见evidence/v0.1/benchmark/benchmark.json及evidence_index.json。测量搜索到两帧、直接IPC SQLite提交与5秒旋转；不是完整UI保存刷新，也不是Iris Xe/60秒/15分钟指标验收。

未测：真实触控板、实际系统DPI/屏幕阅读器全矩阵、低配GPU/所有设备、干净VM/跨机器恢复、完整升级卸载、万条/长时压力、真实断电、全部个人底图/Logo/字段组合和独立v0.1验收。没有开展本轮排除的通信权限、网络安全、文件路径安全或地图边界审查。

没有开放的已复现本轮P2修复缺陷；仍保留known_issues中的设备/资源尺度/高级组合限制。v0.1只在本地交付，未上传GitHub。
