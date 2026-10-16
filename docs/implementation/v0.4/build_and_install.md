# v0.4 构建、安装与备份

产品v0.4 / 工程0.4.0，Windows x64。本地安装包和源码包位于release/v0.4，SHA256SUMS.txt记录最终哈希。安装包携带Electron、SQLite、地图、字体和全部已准备静态资料，运行不需要Node、Python或联网。

安装前退出旧版，建议先Settings → Data & backup → Export backup。运行AirJourney-v0.4-x64-setup.exe，选择安装目录；用户正常数据库仍在LOCALAPPDATA/AirJourney，安装不会主动升级覆盖schema1数据。本次测试用项目内隔离安装和合成资料，未读取默认个人目录。

备份：Export backup导出.airjourney；Import backup先预览，可合并或Replace entire personal library。替换前应先导出当前资料；确认替换会按用户选择恢复整份个人数据和偏好，包括历史机场引用，普通界面仍不能编辑机场。恢复后核对航班数量、标签、自定义字段、个人SVG和路线模式。完整基准目录随安装包提供，个人备份包含已引用快照。实际跨机器恢复未测。

源码构建：Node 24或兼容22.12+，执行npm ci --no-audit --no-fund、npm test、npm run build，等待构建成功后执行npm run package。不要在构建未完成时打包。输出release/v0.4；已有准备资源无需重新下载。

图标：public/app-logo.svg唯一来源；node scripts/render-app-icon.cjs生成透明512px PNG，python scripts/create-icon.py生成ICO/各尺寸PNG。资源准备为开发工具，需Python lxml/fontTools/Pillow及Playwright/Chrome，AIRJOURNEY_PLAYWRIGHT可指定Playwright模块；并非用户运行依赖。

Logo可离线重整：python scripts/prepare-v04-logos.py、python scripts/expand-logo-contours.py .tools/v0.4-sources/expanded、node scripts/split-v04-airline-logos.cjs、node scripts/finalize-v04-resources.mjs。保留原件和元数据作为输入。重新拆分后应重新生成并人工核对联系图和严格SVG检查，不能把脚本成功当作视觉正确。

安装版自动检查脚本：scripts/v04-regression.cjs、scripts/v04-upgrade-display.cjs、scripts/v04-map-recovery.cjs，传入安装的AirJourney.exe和独立证据目录。脚本仅使用合成隔离资料；普通运行无测试钩子也须检查。原生图标使用scripts/verify-app-icon.ps1读取PE和运行窗口WM_GETICON。不要在测试运行中执行安装程序，以免安装器结束测试进程。

本机打包缓存解压winCodeSign时排除了macOS的darwin符号链接目录，Windows rcedit保持原始工具；未关闭PE图标编辑。签名流程日志不是已签名凭证，以Authenticode的NotSigned为准。缓存、依赖、安装后资料不放入源码包。

用户要求测试不占用桌面后，当前自动脚本均设置AIRJOURNEY_BACKGROUND_TEST=1：窗口创建为隐藏、采用离屏渲染并禁用后台节流，输入通过应用内部调试通道发送，不操作系统鼠标键盘。正常启动不设置此变量。原生最小化/恢复在最终后台回归中留作未测，避免弹出窗口；早期可见候选的原生目视记录单独标记版本/hash。

后台环境下，时区原生datalist输入和鼠标悬浮不按可见窗口方式驱动：表单提交相同input事件；悬浮直接调用地图已注册的MOUSE_MOVE入口，仍由真实WebGL场景执行drillPick。没有模拟返回路线对象，也没有绕过业务校验。最终隐藏测试不作为原生鼠标事件接线、触控板或前台窗口行为的复测结论。
