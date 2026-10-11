# 本轮证据索引

- [report.md](report.md)：结论、架构、执行、限制与迭代建议。
- [acceptance_results.csv](acceptance_results.csv)：AC-01–AC-24 子项执行表。PASS 是该子项通过，NOT RUN 不参与通过推定；整体按当前基本闭环规则判定。
- [issues.md](issues.md)：四项 P2 和一项 P3 的复现、预期/实际、影响、修复与复测。

## 日志

`logs/unit-tests.log`、`build-unsandboxed.log` 为最终成功测试/构建；`build.log` 保留早先环境 EPERM。`logs/independent-results*.json` 与 runner 日志是实际发布程序的独立用例；阶段 1 的航司定位 FAIL 是工具错误，阶段 2 修正后四类均通过。阶段 1 的 precision/tag PASS 表示成功记录异常，产品结果在执行表记 FAIL。

`logs/native-backup-roundtrip.json`、`fresh-profile-restore.json` 均全状态相等；`import-cancel.json`、`import-invalid.json` 证明取消/错误文件未修改状态；`library-import-wrong-category.json` 是 AF-04 最终落库证据。

`logs/resource-check-final.json` 是权威资源校验；初次 `resource-check.json` 误处理 ASAR `::` 项，保留而不采用。`source-zip-comparison.json` 是代码与规划文档分别比较结果。`data/smoke/smoke-results.json` 是本轮复跑结果，不是旧报告副本；`data/benchmark/benchmark.json` 是播入独立种子后复跑的1000条短时观察，不是完整理想性能验收。

## 截图

| 文件 | 内容 |
| --- | --- |
| 01-empty.jpg–04-edit-rotate.jpg | 原生程序空库、新建保存、路线、编辑/地球操作 |
| 05-time-distance-logo.png | 正常时区、人工距离及已有 LH Logo |
| 06-unlocated.png | 自定义缺坐标记录 |
| 07-dark-reload.png | 外观重新载入 |
| 08-personal-svg.png | 导入个人 SVG 预览 |
| 09-native-backup-preview.png | 独立空库恢复前的正常备份预览 |
| 10-permanent-delete-confirm.png | 明确永久删除提示 |
| 11-samepoint.png | 同点路线 |
| 12-settings-queue.png | 连续设置后的最终界面；具体期望/实际见 stage3 JSON |
| 13-conflict-preview.png | 冲突备份预览 |
| 14-invalid-backup.png | 错误导入后界面；未截到错误 toast，不用于证明错误文案 |
| 15-library-import-preview.png–16-library-import-other-tab.png | 机场预览后切航司页；错类保存以 JSON 证明 |
| 17-fresh-profile-restored.png | 独立空库恢复完成 |
| failure-9.png | 阶段1工具未找到按钮的原始现场，不是产品错误证据 |

本轮 smoke 截图另在 `data/smoke`，性能截图在 `data/benchmark`。`data` 中数据库和导出素材均为验收构造数据。

## 复跑说明

在项目根目录，以 `.tools/bin/npm.cmd test` 和 `.tools/bin/npm.cmd run build` 复跑，先将 `.tools/bin` 加入本次 shell PATH。不要执行 package，本轮无需重打交付包。

原生操作或独立脚本启动前，设置进程环境 `AIRJOURNEY_TEST_DIR` 指向**新的验收用户目录**，然后运行 `release/win-unpacked/AirJourney.exe`。独立 `client.mjs` 使用 `--remote-debugging-port=9338` 的实际应用页 `airjourney://app/index.html`，并非开发网页。runner 各阶段有上下文先后依赖，不应在真实个人目录或不符合前置数据的现有库直接运行。`actions.mjs` 是分阶段操作辅助，文件对话框需原生界面选择对应的本目录文件。它不是无人值守一键套件。

复跑内置打包 smoke：独立目录 + `AIRJOURNEY_SMOKE=1` 启动 exe；性能：再置 `AIRJOURNEY_BENCHMARK=1`，先用 `seed-benchmark.mjs` 在独立测试目录准备种子状态。复跑前阅读脚本前置条件，复制一份新测试目录，保留本轮原始证据。
