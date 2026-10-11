const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  protocol,
  net,
} = require("electron");
const fs = require("node:fs"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url");
const initSqlJs = require("sql.js");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "airjourney",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
app.setName("AirJourney");
app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-component-update");
const userDirectory = process.env.AIRJOURNEY_TEST_DIR
  ? path.resolve(process.env.AIRJOURNEY_TEST_DIR)
  : path.join(
      process.env.LOCALAPPDATA || path.join(app.getPath("appData"), "../Local"),
      "AirJourney",
    );
app.setPath("userData", userDirectory);
let db, SQL, location;
const requestAudit = [];
function persist(next) {
  const bytes = Buffer.from(next.export()),
    temp = location + ".pending";
  const fd = fs.openSync(temp, "w");
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (fs.existsSync(location))
    fs.copyFileSync(location, location + ".previous");
  fs.renameSync(temp, location);
}
app.whenReady().then(async () => {
  const data = userDirectory;
  fs.mkdirSync(data, { recursive: true });
  location = path.join(data, "airjourney.sqlite");
  SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, "../node_modules/sql.js/dist", f),
  });
  try {
    db = new SQL.Database(
      fs.existsSync(location) ? fs.readFileSync(location) : undefined,
    );
    const version = db.exec("PRAGMA user_version")[0].values[0][0];
    if (version !== 0 && version !== 1)
      throw Error("Unsupported database version; original file preserved.");
    db.run(
      "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL); PRAGMA user_version=1;",
    );
  } catch (e) {
    dialog.showErrorBox(
      "Storage error",
      "The database could not be opened. Your files have been preserved. Restore a backup or contact support.\n" +
        location,
    );
    app.quit();
    return;
  }
  protocol.handle("airjourney", (request) => {
    const u = new URL(request.url);
    let rel;
    try {
      rel = decodeURIComponent(u.pathname);
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    const root = path.resolve(__dirname, "../dist");
    const target = path.resolve(root, "." + rel);
    if (u.host !== "app" || !target.startsWith(root + path.sep))
      return new Response("Blocked", { status: 403 });
    return net.fetch(pathToFileURL(target).toString());
  });
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = /^(airjourney:|file:|data:|blob:|devtools:)/.test(
      details.url,
    );
    if (process.env.AIRJOURNEY_SMOKE)
      requestAudit.push({
        scheme: new URL(details.url).protocol,
        type: details.resourceType,
        external: !allowed,
      });
    if (!allowed)
      fs.appendFileSync(
        path.join(data, "blocked-network.log"),
        `${new URL(details.url).protocol} blocked\n`,
      );
    callback({ cancel: !allowed });
  });
  // Allow only local WebAssembly compilation used by Cesium codecs. JavaScript eval remains prohibited.
  session.defaultSession.webRequest.onHeadersReceived((d, cb) =>
    cb({
      responseHeaders: {
        ...d.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'",
        ],
      },
    }),
  );
  ipcMain.handle("load", () => {
    const r = db.exec("SELECT json FROM state WHERE id=1");
    return r.length ? JSON.parse(r[0].values[0][0]) : null;
  });
  ipcMain.handle("data-path", () => location);
  ipcMain.handle("save", (_e, s) => {
    if (typeof s !== "string" || s.length > 100 * 1024 * 1024)
      throw Error("Invalid or oversized state.");
    const parsed = JSON.parse(s);
    if (parsed.schema !== 1 || !Array.isArray(parsed.flights))
      throw Error("Invalid state.");
    const next = new SQL.Database(db.export());
    try {
      next.run("BEGIN");
      next.run("INSERT OR REPLACE INTO state VALUES(1,?)", [s]);
      next.run("COMMIT");
      persist(next);
      db.close();
      db = next;
    } catch (e) {
      next.close();
      throw e;
    }
    return true;
  });
  ipcMain.handle("export-file", async (_e, name, bytes) => {
    if (
      !/^[\w.-]+$/.test(name) ||
      !Array.isArray(bytes) ||
      bytes.length > 100 * 1024 * 1024
    )
      throw Error("Invalid export.");
    if (process.env.AIRJOURNEY_SMOKE) {
      fs.writeFileSync(path.join(data, name), Buffer.from(bytes));
      return true;
    }
    const result = await dialog.showSaveDialog({ defaultPath: name });
    if (result.canceled) return false;
    fs.writeFileSync(result.filePath, Buffer.from(bytes));
    return true;
  });
  ipcMain.handle("import-file", async () => {
    if (process.env.AIRJOURNEY_SMOKE) {
      const p = path.join(data, "import-next.bin");
      return fs.existsSync(p)
        ? { name: "fixture.airjourney", bytes: Array.from(fs.readFileSync(p)) }
        : null;
    }
    const r = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Local data",
          extensions: [
            "airjourney",
            "json",
            "svg",
            "zip",
            "png",
            "jpg",
            "jpeg",
            "csv",
          ],
        },
      ],
    });
    if (r.canceled) return null;
    const p = r.filePaths[0];
    if (fs.statSync(p).size > 50 * 1024 * 1024)
      throw Error("File exceeds 50 MB limit.");
    return { name: path.basename(p), bytes: Array.from(fs.readFileSync(p)) };
  });
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#f7f8fa",
    title: "AirJourney v0.0",
    icon: path.join(__dirname, "../dist/app-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: !process.env.AIRJOURNEY_SMOKE,
      additionalArguments: process.env.AIRJOURNEY_SMOKE
        ? ["--airjourney-smoke"]
        : [],
    },
  });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("airjourney://app/")) e.preventDefault();
  });
  win.webContents.on("console-message", (_e, level, msg) => {
    if (process.env.AIRJOURNEY_SMOKE)
      fs.appendFileSync(
        path.join(data, "renderer-console.log"),
        String(msg) + "\\n",
      );
  });
  await win.loadURL("airjourney://app/index.html");
  if (process.env.AIRJOURNEY_SMOKE) {
    require(
      process.env.AIRJOURNEY_BENCHMARK ? "./benchmark.cjs" : "./smoke.cjs",
    )(win, data)
      .then(() => {
        fs.writeFileSync(
          path.join(data, "request-audit.json"),
          JSON.stringify(
            {
              requests: requestAudit,
              externalAttempts: requestAudit.filter((r) => r.external).length,
              physicalNetworkDisconnected: false,
            },
            null,
            2,
          ),
        );
        app.exit(0);
      })
      .catch(async (e) => {
        fs.writeFileSync(path.join(data, "smoke-error.txt"), String(e.stack));
        fs.writeFileSync(
          path.join(data, "failed.png"),
          (await win.webContents.capturePage()).toPNG(),
        );
        fs.writeFileSync(
          path.join(data, "failed-body.txt"),
          await win.webContents.executeJavaScript("document.body.innerText"),
        );
        app.exit(1);
      });
  }
  if (process.env.AIRJOURNEY_EVIDENCE) {
    setTimeout(async () => {
      const dir = path.resolve(process.env.AIRJOURNEY_EVIDENCE);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "desktop.png"),
        (await win.webContents.capturePage()).toPNG(),
      );
      fs.writeFileSync(
        path.join(dir, "runtime.json"),
        JSON.stringify(
          {
            versions: process.versions,
            metrics: app.getAppMetrics(),
            gpu: await app.getGPUInfo("basic"),
          },
          null,
          2,
        ),
      );
    }, 10000);
  }
});
app.on("window-all-closed", () => app.quit());
