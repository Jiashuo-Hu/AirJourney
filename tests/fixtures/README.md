# v0.0 兼容性测试夹具

v00-journal.sqlite 和 v00-state.airjourney 来自原 v0.0 安装版的隔离 smoke 测试目录，全部航班为合成记录（AJ-TEST / Custom 等），不包含默认个人数据库。

保留原 schema1、无 precision/routeHeight 的数据与内嵌 SVG，供 v0.1-upgrade-display.cjs 验证实际加载、编辑/重启和完整恢复。两份夹具对应测试过程中的不同保存时刻，不要求它们彼此全状态相同。来源及 hash 记录在本次 evidence_index/交付核对中。
