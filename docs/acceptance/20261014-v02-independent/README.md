# 证据索引

[report.md](report.md)是结论；[issues.md](issues.md)给出优先级/已观察步骤/预期实际/影响/修复和复测；[acceptance_results.csv](acceptance_results.csv)区分通过、失败和未测。

本轮脚本audit-data.py独立对照本地原始快照；verify.mjs只读核验ASAR、源码ZIP、资源摘要；driver.cjs连接9342端口的实际v0.2正常窗口，使用独立库。不要在个人库直接复跑。现有v02-regression、v02-upgrade-display传入release/v0.2实际exe和本轮新输出目录，未调用打包/交付脚本。

重要日志：airport-data-audit.json全量转换及覆盖；runtime-search-samples.json14国家实选；delivery-verification.json产物；created-state/before-restart/restart-check证明正常重启；provenance/ui-bugs证明来源问题；render-error及render-transition-observed-error证明渲染异常；最终render-transition-results记录三轮未触发。不能把最后未触发改写成前面错误不存在。

截图01表单、02全球路线浅主题、03深主题、04重启；05/06修改坐标后旧来源、07新手工位置默认来源；08原生资料预览、09近似记录后地图停止、10待定位、11重码结果；14完整渲染停止、15重启后恢复但标签重叠、16/17重复切换保存；18重复后正常界面。12/13真实空库备份预览/完成截图未生成，因为用户停止界面操作，不能视为通过。

首次smoke输出在data/smoke，250ms后聚合按钮数断言0≠2；failed-body显示稍后弹层已呈现。原样重新执行的data/smoke-rerun是16/16，保留两次结果。一次render-transition未展开More details导致Notes定位超时，属于工具失败，记录render-transition-tool-failure与failure截图；修正工具后继续，未改产品。Computer Use变量绑定一次需刷新，也未计产品问题。

用户物理Escape停止Computer Use后没有再执行任何应用控制或测试，仅整理现有证据。空库恢复窗口停在文件选择，不自动关闭或继续；本目录data/fresh-restore不能当作已成功恢复库。native-v02.airjourney是停止前实际导出的构造备份。
