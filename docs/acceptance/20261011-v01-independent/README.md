# v0.1 独立验收证据

报告：[report.md](report.md)；新问题复现：[issues.md](issues.md)；执行表：[acceptance_results.csv](acceptance_results.csv)。不覆盖历史验收，不修改产品代码/版本，不上传GitHub。

## 主要证据

- `logs/unit-tests.log` / `build.log`：本轮20测试与构建。
- `logs/delivery-verification.json`：独立ASAR/资源/源码文档比较与摘要。package.json运行清单裁剪为预期差异。
- `data/smoke/smoke-results.json`：本轮16基本回归；`data/regression/results.json`：本轮25专项；`data/upgrade/results.json`：本轮7兼容及软件比例。全部运行v0.1实际exe。
- `logs/create-results.json`、`manual-created.json`、`restart-check-results.json`：独立录入与正常模式实际重启。
- `logs/library-switch-results.json`：真实机场文件导入切航司页仍正确；`logs/restore-check-results.json`：真实备份导出后独立空库全状态相等。
- `logs/native-wheel-*.json` / `native-double-*.json`：原生输入相机高度；真实触控板NOT RUN。
- `logs/route-refresh-results.json`：两次静止航线问题；`logs/normal-route-check-results.json`：无smoke标志、无测试钩子的正常发布模式再复现。
- `logs/library-draft-results.json`：资料草稿切类别静默消失。

## 截图索引

01编辑、02浅主题路线、03深主题设置、04深主题路线、05重启；06本地日期排序探索（按设计，非bug）；07改名称保留原坐标的探索（体验提示建议）；08真实恢复预览、09空库恢复；10原生双击；11/12系列设置后路线消失/微滚恢复；13工具漏填必填字段现场；14/15资料草稿切页前后；16/17真实机场导入切页；18/19/20正常发布模式的路线可见→设置后消失→滚动恢复。

`data/regression`、`data/smoke`、`data/upgrade`另含本轮回归截图。`data`所有飞行素材为构造数据，不是个人记录。地图政治边界等排除项不作审查。

## 复跑与工具限制

现有测试/构建使用项目npm，PATH包含`.tools/bin`；`scripts/v01-regression.cjs`、`v01-upgrade-display.cjs`传入v0.1exe路径与新的输出目录。本轮未执行package/deliver脚本，避免改发布包和实现报告。

`driver.cjs`为本轮独立操作辅助，连接9341端口的实际app页面；动作依赖指定测试状态，不能在个人库直接运行。启动应用必须设AIRJOURNEY_TEST_DIR指向新的独立目录。旧缺陷专项的测试模式使用AIRJOURNEY_SMOKE=1和AIRJOURNEY_UI_TEST=1；真实文件对话框和正常模式新bug检查删掉这两个变量。真实触控板不可用，用模拟事件不能获得设备通过结论。

初次独立create用例误选目录没有的NRT（同时事先假设ANA），停在选择；修正为实际HND/Japan Airlines后通过。探索时间记录初次漏填必需地点名，保存被正常拒绝，修正夹具后继续。原始create-tool-failure.json、newbugs-tool-failure.json和failure截图保留，不计产品bug。一次原生对话框按钮点击报geometry unavailable，刷新后使用窗口显示的Alt+O快捷键成功；这也是工具限制。

`logs/newbugs-results.json`中的V01-01/02是原始探索观察编号，不是本轮正式缺陷编号：UTC跨日期顺序符合当地日期优先的BR11；改地点名保留其他字段只列交互澄清建议。正式缺陷编号为issues.md里的V01-N01–N03。
