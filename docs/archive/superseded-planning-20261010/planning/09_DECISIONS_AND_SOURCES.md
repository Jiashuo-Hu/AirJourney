# 09 · 决策、风险、待办与来源

状态：已失效旧稿（未编号） · 调查日期：2026-10-10（Asia/Shanghai）。技术与价格随时间改变，P0 重新核对。以下选型是计划 Agent 的判断，不是供应商对本项目的兼容性或授权承诺。

## 1. 计划默认决策

| ID | 决策 | 理由 | 变更影响 |
| --- | --- | --- | --- |
| D-01 | Windows 11 x64 首发 | 聚焦一个可测平台 | 扩展 Win10/ARM64 需要安装和 GPU 矩阵 |
| D-02 | 本地单用户，无账号 | 私人旅程、低运维 | 云同步需安全/冲突规格 |
| D-03 | Tauri + React + Cesium + Rust/SQLite | 可组合地球与桌面，统一数据领域 | P0 失败允许有证据替换 |
| D-04 | Inter 默认字体 | 接近所需简洁观感，公开许可可核验 | SF 必须先有适合 Windows 的许可 |
| D-05 | 地图源不在计划阶段冻结 | 图层授权/表达/网络均未实测 | 决定最终成本与地球质量 |
| D-06 | 端点地理弧线 | 用户未提供真实轨迹源 | 实际轨迹另立数据来源要求 |
| D-07 | 飞行时联盟 + 当前信息分别显示 | 避免历史错误 | 历史资料不足要 Unknown |
| D-08 | 计算距离和记录距离分开 | 用户“里程”含义可能不同 | 奖励里程未来独立字段 |
| D-09 | 必填两端日期时间，机型可 Unknown | 确保 旧稿 时间/统计明确 | 日期-only 是未来候选 |
| D-10 | 备份/恢复、主题、基本统计列入推荐 旧稿 | 完整个人工具需可持续保管 | 负责人可调整，但原四项优先 |
| D-11 | 全量目录目标，分批采集不是默许缩减 | 保留用户对航司/Logo 完整性的要求 | 最终覆盖边界必须有证据和负责人决定 |
| D-12 | 文档 Markdown | Agent 易读、可追踪、可版本化 | 需要正式 PDF/Word 时可另行排版 |

这些不是已经获批准的不可改选择；用户原始四项要求优先。实现 Agent 可以在 P0 给出改进提案，不需要为每个普通实现细节反复请求确认。

## 2. 尚待决定/核验

| 问题 | 当前默认 | 谁/何时解决 | 未解决影响 |
| --- | --- | --- | --- |
| 是否公开分发/商业化 | 个人本地原型，尚不发布 | 负责人在发布前 | 影响地图、数据/Logo 再分发与签名 |
| 地图和官方航空数据预算 | 不自动购买 | P0 具体报价后由负责人决定 | 可能阻断正式数据源 |
| 全球支持目录的实际覆盖 | 全量目标，无捏造数字 | 实现 Agent P0 提交 manifest | 全量 Logo 无法判定完成 |
| 历史航司/联盟资料深度 | 支持历史记录，证据不足 Unknown | 实现 P0/P1 | 影响历史标签的完整性 |
| 内地标准英语地球图层 | 生产源未冻结 | P0 技术/供应商核验 | 核心 FR-11 阻断 |
| 地形和离线底图授权 | 在线真实地形；离线低细节降级 | P0 核验许可证与实测 | 异常降级无法正式打包 |
| 用户是否只记日期 | 旧稿 两端完整时间 | 负责人以后可调整 | 未知时间不能伪造 |
| Windows 10/ARM64 | 不作为 旧稿 承诺 | 负责人未来需求 | 无影响 x64 主线 |
| UI 精细方向 | ChatGPT/Apple 原则、Inter、中性色 | P0 图稿验证 | 可以先做设计系统与数据层 |

本计划不以未答可选偏好作为阻塞理由。需要付款、核心范围缩减或对外发布时才提交具体决策，不凭“用户没回复”推定授权。

## 3. 风险登记

| 风险 | 等级 | 应对与触发条件 |
| --- | --- | --- |
| 地图看起来正确但边界/标签不符合目标 | 高 | 分图层核验权威依据、所有级别/主题与离线一致；缺证据阻断 |
| 可下载 Logo 无许可或是假矢量 | 高 | 单文件许可+商标登记、SVG 内容检查、100% 正式目录覆盖 |
| 免费档/旧地图服务退役或限流 | 高 | 不写死免费成本；provider adapter、额度/失败 UI；P0 检查当前条款 |
| 国际源在大陆网络不可达 | 高 | 真机网络、备用已核验图层、离线降级；不以境外测试代替 |
| 机场映射时区或 DST 错误 | 高 | 明确 IANA 映射与固定规则、双 UTC/offset 保存、独立 oracle |
| 历史联盟被当前关系覆盖 | 中高 | 有效期/状态/快照，Unknown 如实显示 |
| WebView2 GPU/驱动/打包资源不兼容 | 中高 | P0 release 安装验证、备选壳、列表降级 |
| 备份/迁移损坏真实旅程 | 高 | 事务、在线一致备份、升级副本、故障演练 |
| 10000 航线或标签导致卡顿 | 中 | viewer 单实例、聚合/LOD/按需渲染、主环境基准 |
| 地图 token 泄露导致额度滥用 | 中高 | 客户端 token 最小权限，服务限制和用量管理；不嵌入秘密 |
| 全球资源授权工作低估 | 高 | P0 给数量/覆盖/成本，分批计划需负责人决定最终范围 |

## 4. 已核验来源与证据边界

链接是调查入口，实际下载/分发使用前仍需核验单项条款。下表中“读取成功”说明检索得到来源内容，不代表与 AirJourney 的实际用法已获授权。已知未成功访问明确保留，不能包装成查证结果。

| 来源 | 支持的事实/用途 | 访问状态 |
| --- | --- | --- |
| [IATA 代码数据库](https://www.iata.org/acd) | IATA 官方维护航空公司/机场/地点代码；调查正式目录授权 | 读取成功 |
| [IATA 地点代码说明](https://www.iata.org/en/iata-repository/pressroom/fact-sheets/fact-sheet-iata-location-codes/) | 地点代码管理背景；城市与机场标识需区分 | 读取成功 |
| [OurAirports 数据](https://ourairports.com/data/) | 公开领域机场资料；准确性无保证 | 读取成功 |
| [IANA 时区数据库](https://www.iana.org/time-zones) | 历史 UTC/DST 规则，随政策更新 | 读取成功；不在本计划锁定最新版本号 |
| [Apple Fonts](https://developer.apple.com/fonts/) | SF 公开许可范围，不支持直接当 Windows 分发授权 | 读取成功 |
| [Inter 官方项目](https://github.com/rsms/inter) | 屏幕无衬线字体，OFL 文件与版本来源 | 读取成功 |
| [Tauri 架构](https://v2.tauri.app/concept/architecture/) | Rust + 系统 WebView 的组成 | 读取成功 |
| [Tauri 官方项目](https://github.com/tauri-apps/tauri) | Windows 使用 WebView2 | 读取成功 |
| [微软 WebView2 部署](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) | Runtime 分发/部署核验入口 | 读取成功 |
| [Cesium 影像文档](https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/) | 分层影像与自有服务兼容调查 | 读取成功 |
| [Cesium 内容与归属](https://cesium.com/learn/ion/content-usage-and-attribution-guide/) | 引擎/服务/第三方内容权利不同；缓存和归属受条款约束 | 读取成功 |
| [Cesium 计划](https://cesium.com/platform/cesium-ion/pricing/) | 免费/付费计划边界调查 | 读取成功；不固定价格/长期承诺 |
| [地图管理条例（政府公报）](https://big5.www.gov.cn/gate/big5/www.gov.cn/gongbao/content/2016/content_2979707.htm) | 公开地图和互联网地图服务的适用要求 | 官方繁体镜像内容读取成功；简体页直开 403 |
| [地图管理条例（外交部收录 PDF）](https://www.mfa.gov.cn/web//wjb_673085/zzjg_673183/bjhysws_674671/bhflfg/dtdmxgfl/202303/P020230313586382250479.pdf) | 边界表达和地图要求的权威法规收录入口 | 检索得到摘要；未逐页核验 |
| [Wikimedia Commons 许可](https://commons.wikimedia.org/wiki/Commons:Licensing) | 每个文件分别查授权，开放版权与商标分别考虑 | 读取成功；未核验具体航司 SVG |
| [oneworld 官方成员](https://www.oneworld.com/members) | 当前状态与暂停等需区分 | 读取成功；不视为完整历史库 |
| [SkyTeam 官方成员](https://www.skyteam.com/en/about/our-members/) | 成员核验入口 | 检索获得官方内容；P0 再核最新页面 |

## 5. 尚未完成访问的候选入口

- [自然资源部标准地图服务](https://bzdt.ch.mnr.gov.cn/)：本次读取失败。作为权威地图表达核验入口候选，P0 应实际访问并保存有效依据；未取得可直接用于运行时的矢量/瓦片数据。
- [天地图开发服务](https://lbs.tianditu.gov.cn/)：本次读取失败。服务类型、授权、英语标注、地形/全球覆盖等均待核验，不承诺可直接生产使用。
- [Star Alliance 成员入口](https://www.staralliance.com/en/members)：本次读取失败。代码共享检索结果不能替代成员证据；P0 从有效官方入口/公告核对。
- [ICAO Doc 8643 搜索入口](https://www.icao.int/publications/DOC8643/Pages/Search.aspx)：本次读取失败。具体 type code 和许可需重新核验；本计划未复制官方机型全库。

## 6. 下一个 Agent 的起步清单

先完成 P0 的实际证据和 provider/coverage 清单，再冻结依赖、目录版本与地图方案；同时可推进数据模型和英语设计系统。任何不满足四项核心结果的临时原型必须标注 Prototype/Partial，不能以“已经能用”为由忽略缺口。

