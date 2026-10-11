"""Package reviewable source + selected real evidence; never include user databases."""
from pathlib import Path
import csv, hashlib, json, shutil, zipfile

root = Path(__file__).resolve().parent.parent
out = root / 'docs/implementation'
evidence = root / 'evidence'
smoke = evidence / 'installed-release-smoke'
benchmark = evidence / 'release-benchmark'
results = json.loads((smoke / 'smoke-results.json').read_text(encoding='utf-8'))
assert len(results['results']) == 16 and all(r['status'] == 'PASS' for r in results['results'])
assert not (smoke / 'smoke-error.txt').exists()
perf = json.loads((benchmark / 'benchmark.json').read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
selected = [evidence / n for n in ['build.log', 'unit-tests.log', 'package-final.log',
    'install-final.json', 'hardware-gpu.json', 'hardware-memory.json'] if (evidence/n).exists()]
selected += [smoke/n for n in ['smoke-results.json', 'request-audit.json', 'renderer-console.log'] if (smoke/n).exists()]
selected += [benchmark/'benchmark.json']
(out/'screenshots').mkdir(exist_ok=True)
for p in sorted(smoke.glob('*.png')):
    assert p.stat().st_size > 10000
    shutil.copy2(p, out/'screenshots'/p.name)
with (out/'self_test_results.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['test_id','scope','status','evidence','limitations'])
    w.writerow(['UNIT','14 domain assertions','PASS','evidence/unit-tests.log','Not complete independent acceptance'])
    for i,r in enumerate(results['results'],1):
        w.writerow([f'DESKTOP-{i:02}',r['test'],'PASS','evidence/installed-release-smoke/smoke-results.json','Actual installed app; current machine only'])
    for name,reason in [('CLEAN-OFFLINE','No clean Windows user/VM; system network not disconnected'),
        ('DPI-AT','Full DPI and screen-reader matrix not run'),('PERF-FULL','Not Iris Xe; no 60-second / 15-minute complete benchmark'),
        ('INDEPENDENT','AC-01–24 reserved for third acceptance Agent')]:
        w.writerow([name,reason,'NOT RUN','docs/implementation/known_issues.md','Not counted as passed'])
index = {'version':'v0.0','installer_sha256':sha(root/'release/AirJourney-v0.0-x64-setup.exe'),
    'unitAssertions':14,'installedDesktopScenarios':16,'allSelectedAssertionsPassed':True,
    'physicalNetworkDisconnected':False,'cleanMachine':False,'independentAcceptance':'NOT RUN',
    'evidence':[{'path':p.relative_to(root).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size} for p in selected],
    'performanceProbe':{k:perf[k] for k in ['records','searchP95ms','storageCommitP95ms','interactive5secMedianFPS','baselineMachine','fullAcceptanceBenchmark']}}
(out/'evidence_index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
report = out/'test_report.md'
s=report.read_text(encoding='utf-8').replace('evidence/installed-final-smoke/smoke-results.json` / 后续候选复测目录','evidence/installed-release-smoke/smoke-results.json`')
s=s.replace('evidence/final-benchmark/benchmark.json','evidence/release-benchmark/benchmark.json')
s=s.replace('4. 隐藏/恢复侧栏保留草稿。','4. 隐藏/恢复侧栏保留草稿；Ctrl+N 新建先确认；确认框焦点环、背景 inert 与 Escape关闭。')
old='该次探针：搜索P95约56.8ms，SQLite提交P95约29.3ms，旋转中位80FPS。'
new=f"最终安装版探针：搜索P95约{perf['searchP95ms']:.1f}ms，SQLite提交P95约{perf['storageCommitP95ms']:.1f}ms，旋转中位{perf['interactive5secMedianFPS']:.1f}FPS。"
report.write_text(s.replace(old,new),encoding='utf-8')
trace = out/'requirements_traceability.csv'
trace.write_text(trace.read_text(encoding='utf-8-sig').replace('installed-final-smoke','installed-release-smoke'),encoding='utf-8-sig')
source = root/'release/AirJourney-v0.0-source.zip'
directories=['src','desktop','scripts','public','docs/planning','docs/implementation']
files=[root/n for n in ['README.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','.gitignore']]
files += [p for d in directories for p in (root/d).rglob('*') if p.is_file()]
files += list((root/'tests').rglob('*.ts')) + selected
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
    for p in sorted(set(files)):
        # Embedded delivery manifest precedes source ZIP hash, to avoid circular self-reference.
        z.write(p,p.relative_to(root).as_posix())
artifacts=[root/'release/AirJourney-v0.0-x64-setup.exe',source]
(root/'release/SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.name}\n' for p in artifacts),encoding='ascii')
manifestPath=out/'delivery_manifest.json'
manifest=json.loads(manifestPath.read_text(encoding='utf-8'))
manifest['artifacts']=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in artifacts]
manifest['sourceArchiveNote']='Embedded manifest predates its own ZIP hash; external delivery manifest / SHA256SUMS are authoritative.'
manifest['signature']='NotSigned; actual Authenticode check in evidence/install-final.json'
manifest['evidenceIndex']='docs/implementation/evidence_index.json'
manifestPath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'artifacts':manifest['artifacts'],'desktopTests':16,'unitTests':14},indent=2))
