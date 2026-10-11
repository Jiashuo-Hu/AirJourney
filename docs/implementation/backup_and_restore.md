# 便携备份与恢复

Settings → Data & backup → Export backup 导出 `.airjourney` ZIP。格式 1：manifest.json、data.json。manifest 记录 App、基础资源版本与 data.json SHA-256。data.json 是完整状态：航班（包含 Trash）、资料、快照、旧/新 SVG、个人地图、字段/旧字段值、标签和设置。

资产嵌入数据，不引用本机绝对路径。安装包承担默认地图/字体；备份不重复复制这些默认大资源。历史快照引用的 SVG 即使 Library 已换 Logo，仍随状态完整保存。资源来源说明仍应由用户维护；个人导入不产生分发授权。

## 恢复

Import backup 选择本地文件，先检查 ZIP 路径/总展开量/文件数、格式版本、SHA-256、领域值与 SVG。导入界面显示记录/字段/标签数量与相同/冲突 UUID 数。

- Merge · keep conflicts：同 UUID 保持现有值，相同跳过；其他 UUID 并存。参考资料冲突也保持现有值。当前设置和同 ID 字段定义保留。
- Merge · replace conflicts：冲突航班/资料由备份替换，其他现有数据保留；当前设置与同 ID 字段定义保留。不同定义需选全量恢复。
- Replace entire personal library：完整恢复备份，包括设置、字段与回收站。

确认后先要求选择 pre-import 备份的导出位置；取消该导出也取消本次导入。随后单次 SQLite 事务/文件替换提交，失败不显示成功。导入面板取消不改库。相似但不同 UUID 不主动合并。

限制：输入 ZIP ≤50 MiB，展开 ≤100 MiB、≤20 项，仅允许 manifest.json/data.json；个人 SVG ≤2 MB；个人底图 ≤25 MB、PNG/JPEG、2:1 全球 geographic 图且 ≤8192×4096。ZIP 不向磁盘解压用户路径，不存在接受任意路径的恢复入口。不支持的版本拒绝。

CSV 是可读航班导出，不含完整 SVG/设置，不能替代备份。包含原始本地时间、时区/可用 UTC、人工/估算距离、人工/计算时长、状态、备注和自定义字段；引号/换行转义，公式前缀加单引号保护。

## 故障恢复

退出 App 后先复制整个数据目录作保护。若最新 SQLite 损坏，可以将 `.previous` 复制为 `airjourney.sqlite` 再启动；请先保留损坏文件。App 不会自动重建空库冒充成功。已有可启动库时，通过上述便携恢复流程导入更早备份。两份 SQLite 都不可用时，应在另一个独立数据目录/用户启动，再导入便携包，确认后迁回；不要直接覆盖唯一备份。

原子写失败与完整往返有本应用自动证据；跨另一台真实干净机器/另一 Windows 用户的离线恢复尚未独立测试。
