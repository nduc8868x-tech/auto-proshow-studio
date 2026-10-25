import { useCallback, useEffect, useRef, useState } from "react";
import { type PlayerRef } from "@remotion/player";
import { PreviewPanel } from "./components/PreviewPanel";
import { ProjectManager } from "./components/ProjectManager";
import { TitleLayoutControls } from "./components/TitleLayoutControls";
import { SubscribeTimeline } from "./components/SubscribeTimeline";
import {
  fits,
  motions,
  presets,
  generateTimeline,
  type Project,
  type SceneProps,
} from "./shared/project";
import type { AppAPI, QueueState } from "./app-api";
import type { SubscribeClip } from "./shared/subscribe";
import { motionSettings } from "./shared/motion-settings";
import { reorderImages } from "./shared/reorder-images";
const api = window.appAPI;
export function App() {
  const [data, setData] = useState<SceneProps | null>(null),
    [projects, setProjects] = useState<{ id: string; name: string }[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [queue, setQueue] = useState<QueueState>({ jobs: [], paused: false }),
    [selected, setSelected] = useState<string | null>(null),
    [frame, setFrame] = useState(0),
    [managerOpen, setManagerOpen] = useState(false);
  const [savedLogos, setSavedLogos] = useState<
    Awaited<ReturnType<AppAPI["listLogos"]>>
  >([]);
  const [selectedSubscribe, setSelectedSubscribe] = useState<string | null>(
    null,
  );
  const [timelineDrop, setTimelineDrop] = useState<{
    id: string;
    edge: "before" | "after";
  } | null>(null);
  const player = useRef<PlayerRef>(null),
    drag = useRef<string | null>(null),
    p = data?.project;
  const refresh = async () => setProjects(await api.list());
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void run(async () => {
      const list = await api.list();
      setProjects(list);
      setData(list.length ? await api.open(list[0].id) : await api.create());
      setSavedLogos(await api.listLogos());
    });
    void api.getQueue().then(setQueue);
    return api.onQueue(setQueue);
  }, [run]);
  useEffect(() => {
    if (p?.id) api.setDropProject(p.id);
    return api.onDropped((result) => {
      if (result.data) setData(result.data);
      if (result.error) setError(result.error);
    });
  }, [p]);
  const save = useCallback(async (project: Project) => {
    setData(await api.save(project));
    await refresh();
  }, []);
  const edit = (update: Partial<Project>) => {
    if (p) setData({ ...data!, project: { ...p, ...update } });
  };
  useEffect(() => {
    setSelectedSubscribe(null);
  }, [p?.id]);
  function updateSubscribe(clip: SubscribeClip, commit: boolean) {
    if (!p) return;
    const next = {
      ...p,
      subscribeClips: p.subscribeClips.map((c) =>
        c.id === clip.id ? clip : c,
      ),
    };
    if (commit) void run(() => save(next));
    else edit({ subscribeClips: next.subscribeClips });
  }
  function removeImage(id: string) {
    if (!p || busy) return;
    player.current?.pause();
    const index = p.images.findIndex((i) => i.id === id);
    const images = p.images.filter((i) => i.id !== id);
    void run(async () => {
      await save({ ...p, images });
      if (!images.length) setFrame(0);
      if (selected === id)
        setSelected(images[Math.min(index, images.length - 1)]?.id ?? null);
    });
  }
  const clip = p?.clips.find((c) => c.imageId === selected);
  const exportVideo = useCallback(
    () =>
      run(async () => {
        if (!p) return;
        await save(p);
        const j = await api.exportVideo(p.id);
        if (j) setQueue(await api.getQueue());
      }),
    [p, run, save],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (managerOpen) return;
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (e.code === "Space") {
        e.preventDefault();
        player.current?.toggle();
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (p) void run(() => save(p));
      }
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        void exportVideo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [p, run, save, exportVideo, managerOpen]);
  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const listener = ({ detail }: { detail: { frame: number } }) =>
      setFrame(detail.frame);
    current.addEventListener("frameupdate", listener);
    return () => current.removeEventListener("frameupdate", listener);
  }, [p?.id, p?.clips.length]);

  const openProject = async (id: string) => {
    if (p && p.id !== id) await save(p);
    setData(await api.open(id));
    setSavedLogos(await api.listLogos());
    setSelected(null);
    setFrame(0);
    await refresh();
    setManagerOpen(false);
  };
  const createProject = async () => {
    if (p) await save(p);
    setData(await api.create());
    setSelected(null);
    setFrame(0);
    await refresh();
    setManagerOpen(false);
  };
  const deletedProject = async (id: string) => {
    const remaining = await api.list();
    setProjects(remaining);
    if (p?.id === id) {
      setData(remaining.length ? await api.open(remaining[0].id) : null);
      setSelected(null);
      setFrame(0);
    }
  };
  const duplicateProject = async (id: string) => {
    player.current?.pause();
    if (p) await save(p);
    setData(await api.duplicateProject(id));
    setSelected(null);
    setFrame(0);
    await refresh();
    setManagerOpen(false);
  };
  function reorder(target: string, edge: "before" | "after" = "before") {
    if (!p || busy || !drag.current || drag.current === target) return;
    const images = reorderImages(p.images, drag.current, target, edge);
    player.current?.pause();
    drag.current = null;
    setTimelineDrop(null);
    void run(() => save({ ...p, images }));
  }
  const time = (f: number) => {
    const s = f / (p?.video.fps ?? 30);
    return (
      Math.floor(s / 60)
        .toString()
        .padStart(2, "0") +
      ":" +
      Math.floor(s % 60)
        .toString()
        .padStart(2, "0")
    );
  };
  return (
    <main>
      <header>
        <div className="brand">
          <span className="logo">▶</span>
          <div>
            Auto ProShow <b>Studio</b>
            <small>ẢNH CỦA BẠN. CÂU CHUYỆN CỦA BẠN.</small>
          </div>
        </div>
        <input
          aria-label="Tên dự án"
          value={p?.name ?? ""}
          onChange={(e) => edit({ name: e.target.value })}
        />
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await createProject();
            })
          }
        >
          ＋ Dự án
        </button>
        <button
          disabled={!p || busy}
          onClick={() => p && void run(() => save(p))}
        >
          Lưu
        </button>
        <button
          disabled={!p || busy}
          onClick={() => p && void run(() => duplicateProject(p.id))}
        >
          ⧉ Sao chép dự án
        </button>
        <button
          className="primary"
          disabled={!p?.clips.length || busy}
          onClick={() => void exportVideo()}
        >
          Thêm vào hàng đợi ↗
        </button>
      </header>
      <nav>
        <span>KHÔNG GIAN LÀM VIỆC</span>
        <select
          aria-label="Mở dự án"
          value={p?.id ?? ""}
          onChange={(e) => void run(() => openProject(e.target.value))}
        >
          <option value={p?.id}>{p?.name ?? "Chọn dự án"}</option>
          {projects
            .filter((i) => i.id !== p?.id)
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
        </select>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (p) await save(p);
              await refresh();
              player.current?.pause();
              setManagerOpen(true);
            })
          }
        >
          ▦ Quản lý dự án
        </button>
        <span className="local">● Xử lý cục bộ trên máy</span>
      </nav>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {data?.importReport && (
        <div
          className={
            data.importReport.errors.length
              ? "import-summary warning"
              : "import-summary"
          }
          role="status"
        >
          Đã nhập {data.importReport.imported}/{data.importReport.requested}{" "}
          file.
          {data.importReport.errors.map((message, i) => (
            <div key={i}>{message}</div>
          ))}
        </div>
      )}
      <section className="workspace">
        <aside className="library">
          <div className="section-title">
            Thư viện media <span>{p?.images.length ?? 0} ảnh</span>
          </div>
          <div className="import-actions">
            <button
              disabled={!p || busy}
              onClick={() =>
                p &&
                void run(async () => {
                  await save(p);
                  setData(await api.importMedia(p.id, "images"));
                })
              }
            >
              ＋ Thêm ảnh
            </button>
            <button
              disabled={!p || busy}
              onClick={() =>
                p &&
                void run(async () => {
                  await save(p);
                  setData(await api.importMedia(p.id, "voice"));
                })
              }
            >
              ♫ Thêm voice
            </button>
          </div>
          {p?.voice ? (
            <div className="voice">
              <b>♫ {p.voice.originalName}</b>
              <small>
                {p.voice.durationSeconds.toFixed(2)} giây · Voice chính
              </small>
            </div>
          ) : (
            <div className="hint">
              Thêm một file MP3/WAV để xác định thời lượng video.
            </div>
          )}
          <div className="image-grid">
            {p?.images.map((image, index) => (
              <div
                key={image.id}
                draggable={!busy}
                onDragStart={(e) => {
                  drag.current = image.id;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", image.id);
                }}
                onDragEnd={() => {
                  drag.current = null;
                  setTimelineDrop(null);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => reorder(image.id)}
                className={
                  "thumbnail " + (selected === image.id ? "selected" : "")
                }
                onClick={() => setSelected(image.id)}
              >
                <img
                  draggable={false}
                  loading="lazy"
                  src={data!.urls[image.id + "-thumb"]}
                  alt={image.originalName}
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small title={image.originalName}>{image.originalName}</small>
                <button
                  type="button"
                  className="delete-image"
                  aria-label={"Xóa ảnh " + image.originalName}
                  title="Xóa ảnh khỏi dự án"
                  disabled={busy}
                  draggable={false}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {!p?.images.length && (
            <div className="empty-library">
              ▧<h3>Bắt đầu với những bức ảnh</h3>
              <p>
                AVIF, JPG, PNG, WebP, GIF, BMP…
                <br />
                Tự sắp xếp theo tên file.
              </p>
            </div>
          )}
          <small className="hint">
            Kéo ảnh để đổi thứ tự · Chọn ảnh để chỉnh hiệu ứng
          </small>
        </aside>
        <PreviewPanel
          data={data}
          playerRef={player}
          frame={frame}
          busy={busy}
          selectedSubscribeId={selectedSubscribe}
          onSelectSubscribe={setSelectedSubscribe}
          onSubscribeChange={updateSubscribe}
          onLayout={(layout) =>
            p && edit({ overlay: { ...p.overlay, layout } })
          }
        />
        <aside className="settings">
          <div className="section-title">Thiết lập video</div>
          <label>
            Phong cách
            <select
              value={p?.presetId ?? "classic"}
              onChange={(e) =>
                p &&
                void run(() =>
                  save(
                    generateTimeline(
                      { ...p, presetId: e.target.value as Project["presetId"] },
                      true,
                    ),
                  ),
                )
              }
            >
              {Object.entries(presets).map(([id, v]) => (
                <option value={id} key={id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Khung hình
            <select
              value={p ? p.video.width + "x" + p.video.height : "1920x1080"}
              onChange={(e) => {
                if (!p) return;
                const [width, height] = e.target.value.split("x").map(Number);
                edit({ video: { ...p.video, width, height } });
              }}
            >
              <option value="1920x1080">YouTube · 1080p · 16:9</option>
              <option value="1080x1920">Video dọc · 1080p · 9:16</option>
              <option value="1280x720">Bản nhanh · 720p · 16:9</option>
            </select>
          </label>
          <label>
            Hiển thị ảnh
            <select
              value={p?.visual.fitMode ?? "contain-blur"}
              onChange={(e) =>
                p &&
                edit({
                  visual: {
                    ...p.visual,
                    fitMode: e.target.value as Project["visual"]["fitMode"],
                  },
                })
              }
            >
              {fits.map((f, i) => (
                <option key={f} value={f}>
                  {
                    [
                      "Tự động khớp khung",
                      "Phủ đầy khung",
                      "Nền ảnh làm mờ",
                      "Giữ nguyên ảnh",
                    ][i]
                  }
                </option>
              ))}
            </select>
          </label>
          {p && (
            <>
              {(
                [
                  ["blurPx", "Độ mờ nền", 0, 60, 1],
                  ["backgroundDarkness", "Độ tối nền", 0, 0.4, 0.01],
                  ["backgroundScale", "Độ phóng nền", 1.05, 1.25, 0.01],
                  ["foregroundRadiusPx", "Bo góc ảnh", 0, 24, 1],
                ] as const
              ).map(([key, title, min, max, step]) => (
                <label key={key}>
                  {title}
                  <span className="value">
                    {p.visual[key].toFixed(
                      key === "backgroundDarkness" || key === "backgroundScale"
                        ? 2
                        : 0,
                    )}
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={p.visual[key]}
                    onChange={(e) =>
                      edit({
                        visual: { ...p.visual, [key]: Number(e.target.value) },
                      })
                    }
                  />
                </label>
              ))}
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.visual.foregroundShadow}
                  onChange={(e) =>
                    edit({
                      visual: {
                        ...p.visual,
                        foregroundShadow: e.target.checked,
                      },
                    })
                  }
                />{" "}
                Đổ bóng ảnh chính
              </label>
            </>
          )}
          {p && (
            <label>
              Tốc độ chuyển động (toàn dự án)
              <span className="value">{p.visual.motionSpeed.toFixed(2)}×</span>
              <input
                aria-label="Tốc độ chuyển động toàn dự án"
                type="range"
                min={motionSettings.min}
                max={motionSettings.max}
                step={motionSettings.step}
                value={p.visual.motionSpeed}
                onChange={(e) =>
                  edit({
                    visual: {
                      ...p.visual,
                      motionSpeed: Number(e.target.value),
                    },
                  })
                }
              />
              <small className="hint">
                Áp dụng cho ảnh dùng tốc độ chung. Thời lượng voice giữ nguyên.
              </small>
            </label>
          )}
          {p && (
            <div className="overlay-settings">
              <h4>Tiêu đề & logo xuyên suốt</h4>
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.overlay.enabled}
                  onChange={(e) =>
                    edit({
                      overlay: { ...p.overlay, enabled: e.target.checked },
                    })
                  }
                />
                Bật dải nền trắng
              </label>
              <label>
                Nội dung tiêu đề
                <input
                  aria-label="Tiêu đề xuyên suốt"
                  maxLength={180}
                  value={p.overlay.title}
                  placeholder="Nhập tiêu đề video…"
                  onChange={(e) =>
                    edit({ overlay: { ...p.overlay, title: e.target.value } })
                  }
                />
              </label>
              {p.overlay.logo && (
                <div className="logo-preview">
                  <img
                    src={data!.urls[p.overlay.logo.id]}
                    alt="Logo hiện tại"
                  />
                  <small>{p.overlay.logo.originalName}</small>
                </div>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await save(p);
                    setData(await api.importMedia(p.id, "logo"));
                    setSavedLogos(await api.listLogos());
                  })
                }
              >
                ＋ Thêm logo
              </button>
              <div className="saved-logos" aria-label="Thư viện logo đã lưu">
                <h4>Logo đã lưu ({savedLogos.length})</h4>
                {savedLogos.length ? (
                  <div className="saved-logo-grid">
                    {savedLogos.map((logo) => (
                      <button
                        type="button"
                        key={logo.id}
                        disabled={busy}
                        aria-label={"Dùng logo " + logo.name}
                        title={logo.name}
                        onClick={() =>
                          void run(async () => {
                            await save(p);
                            setData(await api.useLogo(p.id, logo.id));
                          })
                        }
                      >
                        <img src={logo.thumbnailUrl} alt="" />
                        <span>{logo.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <small className="hint">
                    Logo thêm vào được lưu để dùng lại cho các dự án khác.
                  </small>
                )}
              </div>
              {p.overlay.logo && (
                <button
                  disabled={busy}
                  onClick={() =>
                    edit({ overlay: { ...p.overlay, logo: null } })
                  }
                >
                  Bỏ logo
                </button>
              )}
              <small className="hint">
                Chữ đỏ, logo bên phải. Bố cục được áp dụng suốt video.
              </small>
              <TitleLayoutControls
                overlay={p.overlay}
                onChange={(overlay) => edit({ overlay })}
              />
              <label>
                Chế độ xuất
                <select
                  value={p.exportSettings.mode}
                  onChange={(e) =>
                    edit({
                      exportSettings: {
                        ...p.exportSettings,
                        mode: e.target.value as "auto" | "cpu",
                      },
                    })
                  }
                >
                  <option value="auto">Tự động GPU / CPU</option>
                  <option value="cpu">CPU tương thích</option>
                </select>
              </label>
              <label>
                Dựng frame đồng thời
                <select
                  value={p.exportSettings.parallelFrames}
                  onChange={(e) =>
                    edit({
                      exportSettings: {
                        ...p.exportSettings,
                        parallelFrames: Number(e.target.value),
                      },
                    })
                  }
                >
                  <option value={0}>Tự chọn theo CPU/RAM</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option value={n} key={n}>
                      {n} frames
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {clip && p && (
            <div className="inspector">
              <h4>Ảnh đang chọn</h4>
              <label>
                Chuyển động
                <select
                  value={clip.motion}
                  onChange={(e) =>
                    edit({
                      clips: p.clips.map((c) =>
                        c.id === clip.id
                          ? { ...c, motion: e.target.value as typeof c.motion }
                          : c,
                      ),
                    })
                  }
                >
                  {motions.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={clip.motionSpeed !== undefined}
                  onChange={(e) =>
                    edit({
                      clips: p.clips.map((c) =>
                        c.id === clip.id
                          ? {
                              ...c,
                              motionSpeed: e.target.checked
                                ? p.visual.motionSpeed
                                : undefined,
                            }
                          : c,
                      ),
                    })
                  }
                />
                Tốc độ riêng cho ảnh này
              </label>
              <label>
                Tốc độ chuyển động
                <span className="value">
                  {(clip.motionSpeed ?? p.visual.motionSpeed).toFixed(2)}×
                </span>
                <input
                  aria-label="Tốc độ chuyển động ảnh đang chọn"
                  type="range"
                  min={motionSettings.min}
                  max={motionSettings.max}
                  step={motionSettings.step}
                  disabled={
                    clip.motionSpeed === undefined || clip.motion === "none"
                  }
                  value={clip.motionSpeed ?? p.visual.motionSpeed}
                  onChange={(e) =>
                    edit({
                      clips: p.clips.map((c) =>
                        c.id === clip.id
                          ? { ...c, motionSpeed: Number(e.target.value) }
                          : c,
                      ),
                    })
                  }
                />
                <small className="hint">
                  {clip.motionSpeed === undefined
                    ? "Đang theo tốc độ toàn dự án."
                    : "0× dừng · 3× mặc định · 10× nhanh"}
                </small>
              </label>
              <label>
                Chuyển cảnh vào
                <select
                  value={clip.transitionIn}
                  onChange={(e) =>
                    edit({
                      clips: p.clips.map((c) =>
                        c.id === clip.id
                          ? {
                              ...c,
                              transitionIn: e.target
                                .value as typeof c.transitionIn,
                            }
                          : c,
                      ),
                    })
                  }
                >
                  {["fade", "slide-left", "slide-right", "wipe"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Khớp ảnh riêng
                <select
                  value={clip.fitOverride ?? "auto"}
                  onChange={(e) =>
                    edit({
                      clips: p.clips.map((c) =>
                        c.id === clip.id
                          ? {
                              ...c,
                              fitOverride: e.target
                                .value as typeof c.fitOverride,
                            }
                          : c,
                      ),
                    })
                  }
                >
                  {fits.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy}
                onClick={() => selected && removeImage(selected)}
              >
                Xóa ảnh khỏi dự án
              </button>
            </div>
          )}
          <button
            disabled={!p || busy}
            onClick={() =>
              p &&
              void run(() =>
                save(generateTimeline({ ...p, seed: p.seed + 1 }, true)),
              )
            }
          >
            ↻ Tạo lại hiệu ứng
          </button>
        </aside>
      </section>
      <section className="timeline">
        <div className="section-title">
          Timeline{" "}
          <span>
            {p?.clips.length ?? 0} cảnh · {time(p?.video.totalFrames ?? 0)} ·{" "}
            {p?.video.totalFrames ?? 0} frames
          </span>
        </div>
        <p className="timeline-hint">
          Kéo ảnh sang trái/phải để đổi thứ tự. Thả ở vạch tím.
        </p>
        <div
          className="timeline-track"
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setTimelineDrop(null);
          }}
        >
          {p?.clips.map((c, i) => (
            <button
              className={
                "timeline-clip " +
                (selected === c.imageId ? "selected " : "") +
                (timelineDrop?.id === c.imageId
                  ? "drop-" + timelineDrop.edge
                  : "")
              }
              key={c.id}
              style={{ flexGrow: c.durationFrames }}
              data-image-id={c.imageId}
              aria-label={"Ảnh " + (i + 1) + ": " + p.images[i]?.originalName}
              title="Kéo để đổi thứ tự ảnh"
              draggable={!busy}
              onDragStart={(e) => {
                drag.current = c.imageId;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", c.imageId);
                player.current?.pause();
              }}
              onDragOver={(e) => {
                if (!drag.current || busy) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                setTimelineDrop({
                  id: c.imageId,
                  edge:
                    e.clientX < rect.x + rect.width / 2 ? "before" : "after",
                });
                const track = e.currentTarget.parentElement!;
                const bounds = track.getBoundingClientRect();
                if (e.clientX < bounds.left + 45) track.scrollLeft -= 20;
                if (e.clientX > bounds.right - 45) track.scrollLeft += 20;
              }}
              onDrop={(e) => {
                if (!drag.current) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                reorder(
                  c.imageId,
                  e.clientX < rect.x + rect.width / 2 ? "before" : "after",
                );
              }}
              onDragEnd={() => {
                drag.current = null;
                setTimelineDrop(null);
              }}
              onClick={() => {
                setSelected(c.imageId);
                player.current?.seekTo(c.startFrame);
              }}
            >
              <img
                draggable={false}
                src={data!.urls[c.imageId + "-thumb"]}
                alt=""
              />
              <span>
                {i + 1} · {(c.durationFrames / p.video.fps).toFixed(1)}s
              </span>
              {c.transitionInFrames > 0 && (
                <i
                  title={
                    c.transitionIn + " · " + c.transitionInFrames + " frames"
                  }
                >
                  ◈
                </i>
              )}
            </button>
          ))}
        </div>
        {p?.voice && (
          <div className="audio-track">
            ♫ {p.voice.originalName}
            <span>{p.voice.durationSeconds.toFixed(2)}s</span>
          </div>
        )}
        {p && (
          <SubscribeTimeline
            key={p.id}
            project={p}
            frame={frame}
            busy={busy}
            selectedId={selectedSubscribe}
            onSelect={setSelectedSubscribe}
            onPreset={(preset, replace) =>
              void run(async () => {
                player.current?.pause();
                await save(p);
                const result = await api.addSubscribePreset(
                  p.id,
                  preset,
                  replace,
                );
                setData(result);
                const first =
                  result.project.subscribeClips[
                    replace ? 0 : p.subscribeClips.length
                  ];
                setSelectedSubscribe(first?.id ?? null);
                player.current?.seekTo(first?.startFrame ?? 0);
                await refresh();
              })
            }
            onInsert={async (clip) => {
              let saved = false;
              await run(async () => {
                await save({
                  ...p,
                  subscribeClips: [...p.subscribeClips, clip],
                });
                saved = true;
              });
              return saved;
            }}
            onAdd={(source, removeGreen) =>
              void run(async () => {
                player.current?.pause();
                await save(p);
                const added = await api.addSubscribe(
                  p.id,
                  source,
                  Math.max(0, frame),
                  removeGreen,
                );
                setData(added);
                setSelectedSubscribe(
                  added.project.subscribeClips.at(-1)?.id ?? null,
                );
                await refresh();
              })
            }
            onSeek={(at) => {
              player.current?.pause();
              player.current?.seekTo(at);
            }}
            onChange={updateSubscribe}
            onDelete={(id) =>
              void run(() =>
                save({
                  ...p,
                  subscribeClips: p.subscribeClips.filter((c) => c.id !== id),
                }),
              )
            }
          />
        )}
        {p?.voice &&
          p.images.length > 1 &&
          p.clips[1]?.transitionInFrames <
            Math.round(presets[p.presetId].seconds * p.video.fps) && (
            <small>Đã rút ngắn chuyển cảnh để phù hợp thời lượng voice.</small>
          )}
      </section>
      <section className="queue-panel" aria-label="Hàng đợi xuất video">
        <div className="section-title">
          <span>
            Hàng đợi xuất ·{" "}
            {queue.jobs.filter((j) => j.status === "queued").length} đang chờ
          </span>
          <button
            onClick={() =>
              void run(async () => {
                await api.pauseQueue(!queue.paused);
                setQueue(await api.getQueue());
              })
            }
          >
            {queue.paused ? "Tiếp tục hàng đợi" : "Tạm dừng sau video này"}
          </button>
        </div>
        {!queue.jobs.length && (
          <p className="hint">
            Chọn dự án rồi bấm “Thêm vào hàng đợi”. Bạn có thể tiếp tục sửa và
            thêm video khác.
          </p>
        )}
        <div className="queue-list">
          {queue.jobs.map((job) => (
            <div className="queue-item" key={job.id}>
              <div>
                <b>{job.projectName}</b>
                <small title={job.outputPath}>{job.outputPath}</small>
              </div>
              <span>
                {
                  {
                    queued: "Đang chờ",
                    preparing: "Chuẩn bị",
                    rendering: "Đang xuất",
                    finalizing: "Hoàn tất file",
                    completed: "Thành công",
                    cancelled: "Đã hủy",
                    failed: "Thất bại",
                  }[job.status]
                }
              </span>
              <progress value={job.progress} max={1} />
              <span>{Math.round(job.progress * 100)}%</span>
              <small>
                {job.encoder ?? ""}
                {job.concurrency ? " · " + job.concurrency + " frames" : ""}
                {job.elapsedMs
                  ? " · " + (job.elapsedMs / 1000).toFixed(1) + "s"
                  : ""}
              </small>
              {!["completed", "failed", "cancelled"].includes(job.status) && (
                <button
                  onClick={() =>
                    void run(async () => {
                      await api.cancel(job.id);
                      setQueue(await api.getQueue());
                    })
                  }
                >
                  Hủy
                </button>
              )}
              {job.error && <p className="error">{job.error}</p>}
            </div>
          ))}
        </div>
      </section>
      {managerOpen && (
        <ProjectManager
          activeId={p?.id}
          queue={queue}
          onClose={() => setManagerOpen(false)}
          onOpen={openProject}
          onCreate={createProject}
          onDuplicate={duplicateProject}
          onDeleted={deletedProject}
          onRenamed={async (id, name) => {
            setData((current) =>
              current && current.project.id === id
                ? { ...current, project: { ...current.project, name } }
                : current,
            );
            await refresh();
          }}
        />
      )}
      <footer>
        <span>{busy ? "Đang xử lý…" : "Sẵn sàng"} · Auto ProShow Studio</span>
        <span>Ctrl+S lưu · Ctrl+E xuất video</span>
      </footer>
    </main>
  );
}
