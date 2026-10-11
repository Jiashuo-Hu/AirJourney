# 缺陷清单

结论：0 个 P0、0 个 P1、4 个 P2、1 个 P3。以下均未修改产品代码。优先顺序：AF-04 → AF-03 → AF-01 → AF-02 → AF-05。

## AF-01 · P2 · 时间精度选择不能从 Unknown 升级（AC-07）

- 复现：新建空航班，Departure precision 当前 Unknown；在下拉选择 Date and time（或从空日期选择 Date only）。
- 预期：精度选择保留为所选项，让用户随后填写相应字段。
- 实际：立即回到 Unknown；直接填写日期/时间可绕过并正确保存，基础时间计算仍可用。
- 影响：入口行为与用户选择不一致，容易误以为无法录入时间；不阻断新增。
- 证据：`logs/independent-results.json` 的 precision observation（expected Date and time / actual Unknown）；`runner.mjs`；`src/FlightEditor.tsx` 精度由字段值派生，升精度分支未改变字段。
- 修复方向：独立保存草稿精度意图，切换时只清理不适用字段，不虚构日期/时间。
- 复测：空记录及已有记录在 Unknown/Date only/Date and time 间切换，选择可保持、实际值清理规则明确，保存/重启与预览一致。

## AF-02 · P2 · 标签输入吃掉逗号（AC-06）

- 复现：编辑航班的 Tags (comma separated)，逐字输入 `alpha`，再输入逗号，然后继续输入 `beta`。
- 预期：逗号保留为分隔符，形成 alpha、beta 两个标签。
- 实际：输入 `alpha,` 后立即变为 `alpha`，继续输入会变成 `alphabeta`。整串粘贴 `alpha,beta` 可以正常解析。
- 影响：常规键入多标签不可靠，属于补充功能缺陷，不影响记录主体。
- 证据：`logs/independent-results.json` 的 comma tag observation；`runner.mjs`；`FlightEditor.tsx` 每次 change 即 split/trim/filter 再 join。
- 修复方向：保存输入原文，在 blur/提交时规范化，保留正在输入的末尾分隔符。
- 复测：实际逐键输入两个以上标签、中文/空格/重复标签、粘贴和清空；保存/搜索/重启结果正确。

## AF-03 · P2 · 相邻设置保存使用旧全状态，前一项回退（AC-16/17）

- 复现：初始 Light/miles，在第一次保存完成之前，于同一自动化执行轮依次对 Theme 派发 Dark change、Distance unit 派发 km change。不插入人为保存延迟。
- 预期：最终 Dark/km，两次独立设置都保存。
- 实际：最终 Light/km，后一项提交覆盖前一项；日志记录了完整 expected/actual。
- 影响：连续设置可能回退前项。**只证明自动化同轮普通 change 事件的设置回退；尚未复现人手慢速点击或航班丢失**，因此不提高为 P0/P1。
- 证据：`logs/independent-results-stage3.json` observations、`screenshots/12-settings-queue.png`、`runner-stage3.mjs`；`App.tsx` 的 queue 串行写入已计算的 State，`Settings.tsx` 基于渲染时的全状态生成下一状态。
- 修复方向：入队状态变更函数/局部 patch，在队列执行时基于最新成功状态合并；或者在 pending 时明确阻止冲突操作。不要只串行化已经过时的全量快照。
- 复测：连续设置、滑块和不同面板操作；全部变更保存/重启一致，失败写入不会丢失草稿或覆盖已成功保存值。补充原生快速点击复现；若发现普通航班记录丢失再提升等级。

## AF-04 · P2 · 资料导入预览切换类别后写入错误目录（AC-04/19）

- 复现：Library 的 Airports 中导入 `data/library-import.json`；出现机场导入预览后切到 Airlines；在仍保留的预览中 Confirm import。
- 预期：始终导入 Airports，或切页取消/禁止确认预览。
- 实际：该机场对象保存进 Airlines，Airports 中没有对应对象。
- 影响：特定跨页流程使新资料落入错误类别；没有破坏已有航班，基础新增/编辑与正常备份恢复有效。用户需清理错误资料。
- 证据：`logs/library-import-wrong-category.json`（Airports 空匹配、Airlines 包含机场）；`screenshots/15-library-import-preview.png`、`16-library-import-other-tab.png`；`actions.mjs library-switch`；`Library.tsx` 切 kind 未清 incoming，确认使用当前 kind。第二张截图仅显示切页，落库结果以 JSON 为准。
- 修复方向：预览绑定 `{kind, entries}`，确认使用预览类别；切页清预览或禁用类别切换，并明确显示目标目录。
- 复测：四类资料分别预览后切页、返回、取消和确认，不能错类；正常格式/重复冲突结果正确，原引用和历史快照不被静默改写。

## AF-05 · P3 · 源码交付 ZIP 的规划文档滞后（AC-24）

- 复现：解读当前源码 ZIP，对比工作区 docs/planning 文档和当前 07_ACCEPTANCE。
- 预期：交付包文档与交付时宣称的当前功能验收范围一致。
- 实际：17 个规划文档不同，ZIP 是范围修订前的快照；32 个代码/配置/测试/脚本文件相同，当前发布 ASAR 与重建程序一致。
- 影响：接收源码包的人可能按旧范围/结论理解 v0.0，不影响当前运行程序的基本功能。
- 证据：`logs/source-zip-comparison.json`、当前 `docs/planning/00_README.md` 与 `07_ACCEPTANCE.md`。
- 修复方向：下一次交付纳入最新文档、更新交付清单和摘要；本轮不改包，不升级版本。
- 复测：最新规划文档逐文件摘要一致，安装包/ASAR/源码包与交付清单指向同一次交付。
