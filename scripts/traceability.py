import csv
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=root/'docs/planning/templates/requirements_traceability.csv'
mapping={
'FR-01':'src/App.tsx;src/FlightEditor.tsx;desktop/main.cjs','FR-02':'src/domain.ts;src/FlightEditor.tsx','FR-03':'src/Library.tsx;src/FlightEditor.tsx;src/Globe.tsx','FR-04':'src/Library.tsx;src/library-csv.ts','FR-05':'src/Settings.tsx;src/FlightEditor.tsx','FR-06':'src/domain.ts;src/FlightEditor.tsx','FR-07':'src/domain.ts','FR-08':'src/App.tsx','FR-09':'src/Globe.tsx;public/maps','FR-10':'src/Globe.tsx;src/domain.ts','FR-11':'src/Settings.tsx;docs/implementation/known_issues.md','FR-12':'src/App.tsx;src/style.css','FR-13':'src/style.css;src/main.tsx;src/Settings.tsx','FR-14':'src/domain.ts;src/Library.tsx;public/logos','FR-15':'src/Settings.tsx;src/Globe.tsx','FR-16':'desktop/main.cjs;src/Library.tsx;src/domain.ts','FR-17':'src/storage.ts;src/domain.ts;src/library-csv.ts','FR-18':'src/App.tsx;src/Library.tsx','FR-19':'desktop/main.cjs;src/Globe.tsx','FR-20':'src/Settings.tsx;src/Library.tsx'}
rows=list(csv.DictReader(source.open(encoding='utf-8-sig')))
for r in rows:
    key=r['requirement_id'];r['implementation_location']=mapping.get(key,'src/domain.ts;src/App.tsx;desktop/main.cjs')
    r['evidence_path']='tests/domain.test.ts;evidence/unit-tests.log;evidence/installed-release-smoke/smoke-results.json;docs/implementation/test_report.md'
    r['status']='IMPLEMENTED / SELFTEST PARTIAL / INDEPENDENT NOT RUN';r['deviation_or_defect']='当前仅具体自动断言通过，不等于整个 AC 独立通过';r['owner']='Implementation; Independent Acceptance pending'
    if key=='FR-11':r['status']='BLOCKED';r['deviation_or_defect']='K-01: 未取得并核验内地标准政治边界；没有以关闭开关冒充通过'
    elif key=='FR-14':r['status']='PARTIAL';r['deviation_or_defect']='K-02: Lufthansa/Star Alliance/oneworld 真 SVG；SkyTeam 分发许可未解决'
    elif key=='NFR-04':r['status']='MEASURED PROBE / FULL BENCHMARK NOT RUN';r['deviation_or_defect']='高性能当前设备探针；非 Iris Xe；非完整 60秒/15分钟验收'
    elif key=='NFR-05':r['status']='PARTIAL / DPI & SCREEN READER NOT RUN';r['deviation_or_defect']='最小窗口/英语主题有证据；四档系统 DPI/屏幕阅读器未测'
    elif key in ['NFR-01','NFR-07']:r['status']='PARTIAL / CLEAN MACHINE OFFLINE NOT RUN';r['deviation_or_defect']='本机安装/空 App 缓存/应用层外部请求阻断；未实际断开系统网络或使用干净机'
    elif key=='NFR-08':r['status']='DELIVERED / INDEPENDENT NOT RUN';r['deviation_or_defect']='安装包/hash/源码/manifest/备份与自测交付；独立验收未执行'
    elif key=='NFR-06':r['status']='PARTIAL';r['deviation_or_defect']='真实资源与来源随包；K-01/K-02 仍存在'
    elif key=='FR-09':r['deviation_or_defect']='4K/2K自然色影像和小型英语标签；依赖 K-01 的标准边界尚缺'
out=root/'docs/implementation/requirements_traceability.csv'
with out.open('w',newline='',encoding='utf-8-sig') as f:w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
with (root/'docs/implementation/independent_acceptance_results.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f);w.writerow(['test_id','baseline','status','reason'])
    for i in range(1,25):w.writerow([f'AC-{i:02}','v0.0','NOT RUN','供第三个独立验收 Agent 执行；实现自测不能替代独立用例'])
