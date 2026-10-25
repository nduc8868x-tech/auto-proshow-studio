import type { Project, SceneProps } from "./shared/project";
export type Job = {
  id: string;
  projectId: string;
  projectName: string;
  status:
    | "queued"
    | "preparing"
    | "rendering"
    | "finalizing"
    | "completed"
    | "cancelled"
    | "failed";
  progress: number;
  outputPath: string;
  error?: string;
  encoder?: string;
  concurrency?: number;
  createdAt: string;
  elapsedMs?: number;
};
export type QueueState = { jobs: Job[]; paused: boolean };
export type ProjectSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  imageCount: number;
  durationSeconds: number;
  width: number;
  height: number;
  thumbnailUrl?: string;
};
export type AppAPI = {
  listLogos: () => Promise<
    {
      id: string;
      name: string;
      width: number;
      height: number;
      createdAt: string;
      thumbnailUrl: string;
    }[]
  >;
  useLogo: (projectId: string, logoId: string) => Promise<SceneProps>;
  setDropProject: (id: string) => void;
  onDropped: (
    listener: (result: { data?: SceneProps; error?: string }) => void,
  ) => () => void;
  create: () => Promise<SceneProps>;
  duplicateProject: (id: string) => Promise<SceneProps>;
  addSubscribePreset: (
    id: string,
    preset: import("./shared/subscribe-presets").SubscribePresetId,
    replace: boolean,
  ) => Promise<SceneProps>;
  list: () => Promise<ProjectSummary[]>;
  renameProject: (id: string, name: string) => Promise<ProjectSummary>;
  deleteProject: (id: string) => Promise<{ deleted: boolean }>;
  open: (id: string) => Promise<SceneProps>;
  save: (project: Project) => Promise<SceneProps>;
  addSubscribe: (
    id: string,
    source: "builtin" | "file",
    startFrame: number,
    removeGreen: boolean,
  ) => Promise<SceneProps>;
  importMedia: (
    id: string,
    kind: "images" | "voice" | "logo",
  ) => Promise<SceneProps>;
  exportVideo: (id: string) => Promise<Job | null>;
  cancel: (id?: string) => Promise<void>;
  getQueue: () => Promise<QueueState>;
  pauseQueue: (paused: boolean) => Promise<void>;
  onQueue: (listener: (state: QueueState) => void) => () => void;
};
declare global {
  interface Window {
    appAPI: AppAPI;
  }
}
