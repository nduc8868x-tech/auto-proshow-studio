import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { AppAPI, QueueState } from "./app-api";
let dropProject: string | null = null;
const dropListeners = new Set<
  (result: {
    data?: import("./shared/project").SceneProps;
    error?: string;
  }) => void
>();
window.addEventListener("dragover", (e) => {
  if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
});
window.addEventListener("drop", (e) => {
  if (!e.dataTransfer?.files.length || !dropProject) return;
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files)
    .map((f) => webUtils.getPathForFile(f))
    .filter(Boolean);
  if (!files.length) return;
  ipcRenderer
    .invoke("app:drop", dropProject, files)
    .then((data) => dropListeners.forEach((fn) => fn({ data })))
    .catch((error) =>
      dropListeners.forEach((fn) => fn({ error: String(error.message) })),
    );
});
const api: AppAPI = {
  listLogos: () => ipcRenderer.invoke("app:list-logos"),
  useLogo: (projectId, logoId) =>
    ipcRenderer.invoke("app:use-logo", projectId, logoId),
  setDropProject: (id) => {
    dropProject = id;
  },
  onDropped: (listener) => {
    dropListeners.add(listener);
    return () => {
      dropListeners.delete(listener);
    };
  },
  create: () => ipcRenderer.invoke("app:create"),
  list: () => ipcRenderer.invoke("app:list"),
  renameProject: (id, name) =>
    ipcRenderer.invoke("app:rename-project", id, name),
  deleteProject: (id) => ipcRenderer.invoke("app:delete-project", id),
  open: (id) => ipcRenderer.invoke("app:open", id),
  save: (p) => ipcRenderer.invoke("app:save", p),
  addSubscribe: (id, source, startFrame, removeGreen) =>
    ipcRenderer.invoke(
      "app:add-subscribe",
      id,
      source,
      startFrame,
      removeGreen,
    ),
  importMedia: (id, kind) => ipcRenderer.invoke("app:import", id, kind),
  exportVideo: (id) => ipcRenderer.invoke("app:export", id),
  cancel: (id) => ipcRenderer.invoke("app:cancel", id),
  getQueue: () => ipcRenderer.invoke("app:queue"),
  pauseQueue: (paused) => ipcRenderer.invoke("app:pause", paused),
  onQueue: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, job: QueueState) =>
      listener(job);
    ipcRenderer.on("app:queue", handler);
    return () => ipcRenderer.removeListener("app:queue", handler);
  },
};
contextBridge.exposeInMainWorld("appAPI", api);
