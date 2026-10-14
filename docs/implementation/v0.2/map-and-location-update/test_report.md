# 当前 v0.2 更新自测

日期2026-10-14（Asia/Shanghai）。工程0.2.0，产品v0.2，实际安装到evidence/v0.2-map-update/installed-app，隔离构造数据，不操作默认个人数据库。独立重新验收尚未执行；原独立报告的间歇性P1发现保留，不擅自改成独立通过。

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 领域、搜索、备份及新增防护/位置锁测试 | 35/35 PASS | evidence/v0.2-map-update/unit-tests-final.log |
| 资源定位回退分支 | 5/5 PASS | resource-tests.log |
| TypeScript/Vite/NSIS与实际安装 | PASS，exit0，NotSigned | build-final.log、package-final.log、install-final.json |
| 最终安装版地图/位置策略专项 | 17/17 PASS，pageErrors为空 | installed-regression-final4/results.json |
| 更新后既有桌面回归 | 16/16 PASS | installed-smoke-final2/smoke-results.json |
| 旧v0.0/v0.1库/备份与显示检查 | 10/10 PASS | upgrade-display-final2/results.json |
| 本次代码/资源/文档/安装版一致性 | 逐文件校验 | release/v0.2/package-verification.json |

上表日志路径均相对evidence/v0.2-map-update；图像复制到本目录screenshots，完整路径在evidence_index.json。最终安装摘要以release/v0.2/SHA256SUMS.txt为准。

## 自然操作与标签

实际运行打包exe，机场代码初始alpha为0；悬停HND→NRT路线，测得中间alpha在0与1之间，随后两端代码可见；离开有中间alpha再降至0，截图证明不常驻机场名字。zoom-out国家标签以真实DOM边界检查互不重叠，低优先级国家被舍弃。截图已核看。

历史近似坐标和记录逐对象保留。航班/资料库中没有机场经纬度、选点或新增机场入口，Airlines等类别仍可新增。机场导入两项反例（已知机场改纬度、未知手工位置）均拒绝且库不变。新航班从给定FAOR/NZWN选择，用固定坐标，不将整份全球目录写入个人库。

12轮长航段/历史近似短航段/准确近航段切换、编辑保存、侧栏收放，没有自然渲染错误。另复制历史短航段作为新记录，编辑保存后坐标不变、路线存在。最后在无AIRJOURNEY_SMOKE、无__ajTestGlobe/__ajMapDiagnostics的正常模式做3轮长短航段/编辑/侧栏变化，DOM错误观察器没有记录地图错误，最终正常截图中路线可见。没有把仅实体存在当成完整视觉通过。

## 明确标注的故障注入

- CSS视口置零：帧跳过，恢复尺寸后继续绘制，未出现GPU异常。
- 在CSS正常时临时令实际WebGL对象drawingBufferWidth getter返回0：无效帧跳过，恢复后继续。此为人工属性注入，不是自然GPU故障复现。
- 用WEBGL_lose_context主动丢失真实上下文：自动重建，恢复后相机位置/heading/pitch/roll在容差内不变，记录逐对象不变。
- 主动使下一次render抛出Expected width…0：恢复同进程绘制、数据不变。
- 连续注入达到两次自动重试上限：显示Restart map，点击后同进程恢复，记录不变。

注入产生的诊断错误是预期测试事件，结果保留injected标识，不声称测试中从未发生错误。普通操作阶段错误数组为空；验证了保护及恢复路径，不证明用户原始间歇性事件的唯一根因已锁定或所有硬件永不触发。

## 兼容、旧测试适配和限制

真实旧版本构造库及备份在更新版逐对象加载/恢复一致，编辑后实际进程重启保留；Source schema仍1。四档显示检查用Electron软件比例，按4百万像素/4096单边上限验证GL渲染比例；不是实际Windows DPI切换，不能沿用“GL始终等于DPR”的旧假设。

旧smoke中硬编码point-airport-PEK不再匹配目录OA身份，改为实际实体/航班ID；手工新增/选点/输入机场位置的旧测试按用户新范围替换为禁用入口、只读元数据和Unassigned Draft保存。资料快照显式更新只测试名称，坐标不变。初次失败日志保留，最终只采用final2/final4结果。脚本初次夹具包含deleted:undefined导致JSON语义比对失败、取消草稿漏确认导致模态遮挡，均修正测试前置后完整复跑，不计产品缺陷。

完整GPU/真实设备长时、真实Windows DPI/触控板、干净VM、完整升级卸载/断电与独立重验NOT RUN。原纯搜索索引基准文件仅作为初次v0.2历史证据保留，不冒充本轮地图帧率/长期内存验收。

无GitHub推送、PR、Release或上传。当前版本号没有升级。
