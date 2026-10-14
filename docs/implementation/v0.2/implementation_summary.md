> 初次 v0.2 交付记录（保留历史）。当前同版本更新以 [地图与位置策略说明](map-and-location-update/implementation_summary.md)、[最新测试](map-and-location-update/test_report.md) 和 [当前限制](map-and-location-update/known_issues.md) 为准。手工机场位置编辑/新增已撤销，原产物在 release/v0.2/before-map-location-update。

# v0.2 本地实现候选

日期：2026-10-14（Asia/Shanghai）。产品v0.2，工程0.2.0。仅本地实现、测试与打包，无GitHub推送/PR/Release/上传。

## 全球机场资料

新增随包public/data/airports-global.json及覆盖/来源清单airports-global-manifest.json。OurAirports静态快照为公开领域数据，含86,242条、247个国家或地区代码。全部来源坐标对通过有限数值和WGS84范围检查；“airport”表示来源提供的机场坐标，不代表经过独立测绘或保证准确。此快照无缺失/无效坐标，所以实际使用城市回退0条、待定位0条；不人为删坐标制造近似记录。

缺城市4,765条；无IATA77,191条，无ICAO75,691条。无IATA的资料使用ICAO或来源ident作为可读代码，原IATA/ICAO/ident分别保留。范围包括大中小机场、直升机坪、水上基地、气球起降点和停用机场，类型明确、常用机场优先；“global”不等于全球全部机场穷尽。Pitcairn与Tokelau在来源国家列表但无机场条目，未补造资料。原始ID/ident重复为0；共享名称或代码不合并，代码冲突记录在清单。

准备脚本只读取本地静态快照。机场坐标缺失或无效时，GeoNames cities500中同国家、规范化后完全相同的城市必须只有一个独立ID才能回退；标注approximate与城市来源。模糊/跨国/多城市匹配保留unlocated，不猜首都/最大城市。不推断时区。GeoNames CC BY 4.0来源和摘要保留；本次未将其位置写入真实机场资源，城市回退分支用独立夹具验证。

## 个人覆盖与搜索

86,242条只作为只读本地基准；个人SQLite仍保存原资料、覆盖和自定义内容。启动加载目录不迁移/重写个人数据库，不触碰已有航班快照。旧15条起步资料仍优先；未来选择时补充匹配的标识元数据与搜索别名，保留个人名称、坐标及故意缺失的位置，不把基准坐标偷偷填入待定位自定义记录。

目录按来源ID/ident去重；个人同名、重复代码记录保留。基准匹配采用ID或唯一标识码，歧义代码不擅自合并。用户编辑/隐藏作为个人覆盖，Restore bundled values是显式操作，既有航班修改仍走Review snapshot changes。

搜索支持IATA/ICAO/ident、名称、城市、国家地区、别名和多词组合，忽略大小写和常见变音符号。输入控件最多30个结果，Library分页每页60个，避免数万DOM选项。索引缓存标准化文本、基准标识及查询结果，空查询优先个人/常用资料。全目录不会随每次航班保存复制入个人库。搜索耗时与范围见test_report.md。

## 位置表达

可选locationKind/locationSource随资料、航班快照、CSV与备份保存，schema仍为1。airport、approximate、manual、unlocated分别表示来源机场坐标、城市近似、人工位置及待定位。近似位置在编辑/详情中明确标记，地球使用金色机场点及“≈”标签；没有定位的端点不绘制路线，已知端点仍可显示点。颜色/符号不虚构误差半径。来源精度与手工覆盖保持独立，里程仍只是坐标间WGS84示意估计。

## 界面收纳

删除地图大标题、重复映射计数、常驻长说明、侧栏重复说明与多处装饰eyebrow。保留主要导航、Add flight、搜索、筛选、列表/地球联动、侧栏按钮和缩放；地图更多菜单收纳Save home view及操作说明。保留Cesium必需署名。

航班表单保留机场搜索、自由名称、航司和时间，Location & codes与More details默认折叠；设置将格式/辅助选项、详细路线样式、自定义底图与起始视角折叠；备份主按钮仍直接可见，存储路径/格式说明折叠。Library导入直接可见，个人JSON/CSV导出与隐藏选项在Data tools中，明确导出个人条目和覆盖，完整基准另在随包静态JSON。Insights保留完整统计，常驻列表只显示紧凑指标和真实待定位/隐藏提示。

相关改进：按类别保留当前Library草稿；删去低对比地图装饰（V01-N02）；避免无关设置重建地图实体，实体变动后为异步几何补充短时渲染调度（V01-N01相关）。这些属于本轮交互/地图回归，不改写历史独立报告。新选择器Escape只关闭下拉框，防止触发全局放弃草稿。

## 交付

安装包、源码ZIP、SHA-256与交付/一致性清单位于release/v0.2。当前源码包含所有最新规划、历史验收及本轮实现文档；逐文件与当前工作区比较。自身ZIP摘要置于包外清单，避免自引用。保留旧版本产物与报告。实际完成、未测和限制见test_report.md、known_issues.md和requirements_traceability.csv；独立v0.2验收待执行。
