# v0.0 兼容性测试夹具

v03-journal.sqlite 和 v03-state.airjourney 来自 v0.3 最终安装版 verified-regression-final 的隔离合成测试（最多1001条重复航段），分别保留对应保存与实际导出时刻；不包含真实用户资料。v0.4逐份对照其自身JSON验证读取、编辑重启和恢复。

v00-journal.sqlite 和 v00-state.airjourney 来自原 v0.0 安装版的隔离 smoke 测试目录，全部航班为合成记录（AJ-TEST / Custom 等），不包含默认个人数据库。

保留原 schema1、无 precision/routeHeight 的数据与内嵌 SVG，供 v0.1-upgrade-display.cjs 验证实际加载、编辑/重启和完整恢复。两份夹具对应测试过程中的不同保存时刻，不要求它们彼此全状态相同。来源及 hash 记录在本次 evidence_index/交付核对中。

Additional v01 fixtures are copied from the original v0.1 isolated installed-smoke run. They contain synthetic test flights and logos only; SQLite represents the later explicit reference update, while the backup captures its export point. v0.2 tests compare each fixture against its own stored JSON.

v02-journal.sqlite is copied from the actual v0.2 map-update isolated regression profile (5 synthetic MAP-* / NEW-GIVEN flights). v02-state.airjourney is an equivalent schema-1 archive constructed from that preserved JSON, with app=v0.2 and a fresh integrity checksum. It is a compatibility fixture, not an actual user export. No default personal data directory is used.
