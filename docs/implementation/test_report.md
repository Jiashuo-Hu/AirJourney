# v0.0 实现自测报告

这是实现 Agent 的自测证据，不是第三 Agent 的独立验收报告。独立 AC-01–24 初始状态保留 NOT RUN。

## 候选与环境

最终安装包及 SHA-256：见 `delivery_manifest.json`、`release/SHA256SUMS.txt`。实际生产构建及 NSIS 成功日志：`evidence/build.log`、`evidence/package-final.log`。安装验证目录 `evidence/installed-app`；数据使用专用隔离目录，未写真实个人库。

当前设备：Windows 11 家庭版 10.0.26200，Intel Core Ultra 9 275HX，约32 GB RAM；Intel Graphics 和 NVIDIA RTX 5080 Laptop GPU（实际 renderer GPU 见 smoke-results.json）。系统/硬件证据见 `evidence/hardware-*.json`。这是较强设备，不能替代 Iris Xe 同级目标机。

## 已执行自动断言

领域：`npm test`，14 个测试通过，原始日志 `evidence/unit-tests.log`。

- 不完整/日期-only/无时区不猜UTC；允许缺位置保存。
- FX03/04 精确12h/9h；DST gap/overlap unresolved，显式-04/-05得到各自UTC；异常先后保存但无时长。
- (0,0)、同点0距离、人工1000 miles=1609344m；非法数字/范围拒绝。
- 独立固定Wellington→Salamanca oracle，19959679.267m，误差小于0.001m；反子午线/极区/对跖/同点几何有限值。
- 三个真实SVG安全通过，危险文件拒绝；状态完整备份往返、损坏/路径/版本/非法字段拒绝。
- CSV多行/引号/公式前缀与资料CSV字段；个人字段/标签/快照保留。
- 资料明确应用时保留人工坐标/代码覆盖；不同分类同文本ID不会把航司写进机场快照。

安装后桌面：`evidence/installed-release-smoke/smoke-results.json`，16项断言全部通过；测试由本应用自身 BrowserWindow/IPC/DOM执行，运行真正安装的ASAR，不用Vite服务器。

1. 空应用缓存、本地协议资源、单地球实例与影像层加载。
2. 虚构手动航班、Unknown时间、Lufthansa SVG、路线和SQLite。
3. 复制新UUID。
4. 隐藏/恢复侧栏保留草稿；Ctrl+N 新建先确认；确认框焦点环、背景 inert 与 Escape关闭。
5. Trash/Restore。
6. Reload与设置/记录持久化。
7. 故意阻断pending写入，原库不改；实际UI保存失败保持草稿，取消可恢复。
8. 实际UI导出→预览→全量恢复，逐对象相等（包含SVG）。
9. Library仅未来生效不改已有快照。
10. 明确预览确认后更新已有快照。
11. 地球zoom/reset、路线聚合。
12. 实际scene.pick机场点，弹出2航段，点选返回航班并改变路线代表方向。
13. 1024×720无主文档横向溢出。
14. 新自定义机场、地球选点预览和确认保存。
15. 缺航班号/时间/坐标的自定义两端保存，显示Needs location。
16. CSP下JavaScript eval仍被拒绝。

真实截图：`docs/implementation/screenshots`。最初标签部分裁剪由真实图像检查发现，已修复；最小窗口图只证明该当前缩放布局，并不证明所有DPI。

## 网络证据

`request-audit.json` 记录生产浏览器session请求，核心自动流程的外部尝试为0；CSP和session同时限制外部访问。地图/字体/Logo/Workers使用本地路径或内嵌data URL，无token、自动更新或在线查询。

**没有实际断开系统网络，也没有干净Windows用户/VM**。因此NFR-01/EX-01/AC-21完整真实断网验收仍为NOT RUN。不能把应用层阻断扩大为系统HTTP/DNS抓包结论。

## 性能探针

实际安装程序、1000合成条目：`evidence/release-benchmark/benchmark.json`。30次搜索测输入到两帧后；30次SQLite提交测IPC写入；5秒持续旋转测真实scene.postRender间隔。

最终安装版探针：搜索P95约54.3ms，SQLite提交P95约30.2ms，旋转中位153.8FPS。提交指标不包含完整编辑表单/地图刷新；搜索是UI两帧端点，不是全部用例。后续最终候选探针数值以对应JSON/交付证据索引为准。

没有执行基准机、进程冷启5次、60秒交互、15分钟稳定性、10,000条完整UI压力。NFR-04 Should 不能据此宣称全面通过。

## 未测 / 未满足

K-01标准政治边界、K-02第三联盟SVG是实际缺项，不是测试豁免。干净机离线有/无WebView2、真实跨机器恢复、所有自定义字段/样式组合、四档DPI、屏幕阅读器、GPU失败模拟、完整性能矩阵均未完成独立验证。完整产品验收不能给PASS。
