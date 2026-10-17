# v0.5 构建、安装和备份

Windows x64，产品v0.5 / 工程0.5.0。安装包与源码包位于release/v0.5，最终SHA256见同目录SHA256SUMS.txt。正常运行不需网络、Node或Python。

升级前建议在Settings → Data & backup → Export backup导出.airjourney，再退出旧程序，运行安装包。保留原有LOCALAPPDATA/AirJourney数据；本轮测试只用项目隔离目录和合成资料，没有读取默认个人资料库。机场全部信息保持只读。

Import backup提供预览和合并/替换策略；替换前先保存当前完整备份。完整替换会恢复路线颜色、重复路线模式、个人SVG、标签、字段和历史快照，合并仍保留当前设置。年份筛选为临时浏览状态。真实跨机器恢复未测。

源码使用Node24或兼容22.12+：npm ci --no-audit --no-fund、npm test、npm run build，构建完成后npm run package。输出release/v0.5。生产构建将机场原JSON无损压缩为dist/data/airports-global.json.gz；开发预览仍读取public原JSON，部署必须使用完整dist。应用本地解压，目录记录与位置不改。SQLite运行只需实际WASM版本及声明，打包脚本不再复制开发替代构建。

后台实测脚本见scripts/v05-regression.cjs、v05-upgrade-display.cjs、v05-map-recovery.cjs、v05-legacy.cjs、v05-performance.cjs，传入安装的AirJourney.exe和独立输出目录。AIRJOURNEY_BACKGROUND_TEST=1创建隐藏离屏窗口，断言不显示不聚焦；脚本只发送CDP/DOM事件，不操作用户鼠标键盘。没有该变量的正常用户运行保持可见窗口。测试和安装不能同时运行，安装前若用户正在使用AirJourney则应延后，禁止强行结束用户进程。

图标和Logo资源沿用v0.4，同源图标及原件/组合版均保留；本轮没有重新下载或调整图像清晰度。

旧内置smoke的mapped文字断言已过时；v0.5请使用外置scripts/v05-legacy.cjs，实际执行相同既有流程并检查真实路线实体，避免将移除的旧文案当成功能要求。普通运行不设置测试变量。
