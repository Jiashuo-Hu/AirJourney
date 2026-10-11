# v0.1 GitHub 发布说明

用户在本地交付及独立验收之后另行明确授权上传项目，并将版本命名为 v0.1。目标仓库：https://github.com/Jiashuo-Hu/AirJourney；版本标签及 Release 名称均为 v0.1，工程版本0.1.0。

本次发布保留已测试安装包的原始字节（SHA-256：5a06a3c9dbf8196ddcaf453e75880553228dd15280c57b3287c233d9d5aa243d），不修改产品代码、不重建安装包。源码 ZIP 补入后续新增的14号验收提示词、独立v0.1报告/证据及本发布说明，逐文件与当前工作区核对。原本地交付源码 ZIP（SHA-256：79c2fe7d0af578daeb3dcf70b0d681022f65b17492a25dff25b8e6626e3783cf）保存在release/v0.1/local-delivery-snapshot/，不会冒充最新发布源码。最终发布附件摘要在 Release 的 SHA256SUMS.txt；源ZIP自身摘要放在包外，避免自引用。

附件包括 Windows x64 安装包、源码 ZIP、SHA256SUMS.txt、delivery_manifest.json 和 package-verification.json。Git 仓库不提交安装目录、node_modules、缓存和个人数据库；tests/fixtures中的库为明确标注的合成兼容性夹具。

独立验收结论：基本功能通过，无开放P0/P1；AF-01–AF-05复测通过。现有新问题未在本次上传中修复：

- V01-N01 / P2：保存普通设置后，静止地图航线可能暂时消失；轻微缩放后恢复，已保存记录仍在。
- V01-N02 / P3：地图装饰小字在部分浅色底图上对比不足。
- V01-N03 / P3：资料编辑草稿切换类别后直接丢失。

完整复现与证据见docs/acceptance/20261011-v01-independent/issues.md。真实触控板、实际Windows DPI切换、低配/长时性能、干净VM安装及完整卸载矩阵等仍未测；安装包未签名。旧本地实现报告中的“未上传GitHub”“独立验收待执行”描述其撰写时点，当前状态以本发布说明和新的独立验收报告为准。

发布脚本核对远程main、v0.1标签、Release附件大小和SHA-256；成功后的远程回执保存在evidence/github-release-v0.1.json。发布不创建PR，不覆盖v0.0标签或产物。
