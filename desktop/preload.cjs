const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("airjourney", {
  testing: process.argv.includes("--airjourney-smoke"),
  load: () => ipcRenderer.invoke("load"),
  save: (state) => ipcRenderer.invoke("save", state),
  dataPath: () => ipcRenderer.invoke("data-path"),
  exportFile: (name, bytes) => ipcRenderer.invoke("export-file", name, bytes),
  importFile: () => ipcRenderer.invoke("import-file"),
});
