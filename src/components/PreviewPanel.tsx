import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Slideshow } from "../../remotion/Slideshow";
import type { SceneProps } from "../shared/project";
import {
  subscribeGeometry,
  transformSubscribeClip,
  type SubscribeClip,
} from "../shared/subscribe";
import {
  normalizeOverlayLayout,
  type OverlayLayout,
} from "../shared/overlay-layout";
export function PreviewPanel({
  data,
  playerRef,
  frame,
  onLayout,
  busy,
  selectedSubscribeId,
  onSelectSubscribe,
  onSubscribeChange,
}: {
  data: SceneProps | null;
  playerRef: RefObject<PlayerRef | null>;
  frame: number;
  onLayout: (layout: OverlayLayout) => void;
  busy: boolean;
  selectedSubscribeId: string | null;
  onSelectSubscribe: (id: string) => void;
  onSubscribeChange: (clip: SubscribeClip, commit: boolean) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null),
    [size, setSize] = useState({ width: 640, height: 360 }),
    [editing, setEditing] = useState<"title" | "subscribe" | null>(null);
  const subscribeDrag = useRef<{
    kind: "move" | "resize";
    x: number;
    y: number;
    width: number;
    height: number;
    clip: SubscribeClip;
    last: SubscribeClip;
    moved: boolean;
  } | null>(null);
  const drag = useRef<{
    kind: "move" | "resize";
    x: number;
    y: number;
    layout: OverlayLayout;
    width: number;
    height: number;
  } | null>(null);
  const project = data?.project,
    layout = project?.overlay.layout;
  const subscribeClip = project?.subscribeClips.find(
    (c) => c.id === selectedSubscribeId,
  );
  const subscribeAsset = project?.subscribeAssets.find(
    (a) => a.id === subscribeClip?.assetId,
  );
  const subscribeBox =
    project && subscribeClip && subscribeAsset
      ? subscribeGeometry(
          subscribeClip,
          subscribeAsset,
          project.video.width,
          project.video.height,
        )
      : null;
  const subscribeVisible =
    !!subscribeClip &&
    frame >= subscribeClip.startFrame &&
    frame < subscribeClip.startFrame + subscribeClip.durationFrames;
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: node.clientWidth, height: node.clientHeight }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setEditing(null);
  }, [project?.id]);
  const scale = project
    ? Math.min(
        size.width / project.video.width,
        size.height / project.video.height,
      )
    : 1;
  const time = (f: number) => {
    const seconds = Math.floor(f / (project?.video.fps ?? 30));
    return (
      String(Math.floor(seconds / 60)).padStart(2, "0") +
      ":" +
      String(seconds % 60).padStart(2, "0")
    );
  };
  function start(event: PointerEvent<HTMLElement>, kind: "move" | "resize") {
    if (!layout || busy) return;
    event.preventDefault();
    event.stopPropagation();
    playerRef.current?.pause();
    const stage = event.currentTarget
      .closest(".player-stage")!
      .getBoundingClientRect();
    drag.current = {
      kind,
      x: event.clientX,
      y: event.clientY,
      layout: { ...layout },
      width: stage.width,
      height: stage.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const x = ((event.clientX - d.x) / d.width) * 100,
      y = ((event.clientY - d.y) / d.height) * 100;
    onLayout(
      normalizeOverlayLayout(
        d.kind === "move"
          ? { ...d.layout, x: d.layout.x + x, y: d.layout.y + y }
          : {
              ...d.layout,
              width: Math.min(100 - d.layout.x, d.layout.width + x),
              height: Math.min(100 - d.layout.y, d.layout.height + y),
            },
      ),
    );
  }
  function selectSubscribe(id: string) {
    const item = project?.subscribeClips.find((c) => c.id === id);
    if (!item) return;
    onSelectSubscribe(item.id);
    playerRef.current?.pause();
    playerRef.current?.seekTo(item.startFrame);
    setEditing("subscribe");
  }
  function startSubscribe(
    event: PointerEvent<HTMLElement>,
    kind: "move" | "resize",
  ) {
    if (!subscribeClip || !subscribeAsset || busy) return;
    event.preventDefault();
    event.stopPropagation();
    playerRef.current?.pause();
    event.currentTarget.focus({ preventScroll: true });
    const stage = event.currentTarget
      .closest(".player-stage")!
      .getBoundingClientRect();
    subscribeDrag.current = {
      kind,
      x: event.clientX,
      y: event.clientY,
      width: stage.width,
      height: stage.height,
      clip: { ...subscribeClip },
      last: subscribeClip,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveSubscribe(event: PointerEvent<HTMLElement>) {
    const d = subscribeDrag.current;
    if (!d || !subscribeAsset || !project) return;
    d.moved ||=
      Math.abs(event.clientX - d.x) > 2 || Math.abs(event.clientY - d.y) > 2;
    d.last = transformSubscribeClip(
      d.clip,
      subscribeAsset,
      project.video.width,
      project.video.height,
      (100 * (event.clientX - d.x)) / d.width,
      (100 * (event.clientY - d.y)) / d.height,
      d.kind === "resize",
    );
    onSubscribeChange(d.last, false);
  }
  function finishSubscribe() {
    const d = subscribeDrag.current;
    subscribeDrag.current = null;
    if (d?.moved) onSubscribeChange(d.last, true);
  }
  return (
    <article className="preview">
      <div className="section-title">
        <span className="preview-label">Xem trước</span>
        <span>
          {project?.video.width} × {project?.video.height} ·{" "}
          {project?.video.fps ?? 30} FPS
        </span>
        <button
          type="button"
          disabled={busy || !project?.clips.length || !project.overlay.enabled}
          onClick={() => setEditing(editing === "title" ? null : "title")}
        >
          {editing === "title" ? "Xong chỉnh vị trí" : "Chỉnh vị trí"}
        </button>
        <button
          type="button"
          disabled={
            busy || !project?.clips.length || !project.subscribeClips.length
          }
          onClick={() => {
            if (editing === "subscribe") {
              setEditing(null);
              return;
            }
            const item =
              subscribeClip ??
              project?.subscribeClips.find(
                (c) =>
                  frame >= c.startFrame &&
                  frame < c.startFrame + c.durationFrames,
              ) ??
              project?.subscribeClips.at(-1);
            if (item) selectSubscribe(item.id);
          }}
        >
          {editing === "subscribe" ? "Xong chỉnh sub" : "Chỉnh vị trí sub"}
        </button>
        {!!project?.subscribeClips.length && (
          <select
            aria-label="Subscribe trên preview"
            disabled={busy}
            value={selectedSubscribeId ?? ""}
            onChange={(e) => selectSubscribe(e.target.value)}
          >
            <option value="">Chọn sub…</option>
            {project.subscribeClips.map((c, i) => (
              <option key={c.id} value={c.id}>
                Sub {i + 1} · {(c.startFrame / project.video.fps).toFixed(2)}s
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="player-wrap" ref={viewport}>
        {project?.clips.length && data ? (
          <div
            className="player-stage"
            style={{
              position: "relative",
              width: project.video.width * scale,
              height: project.video.height * scale,
              flexShrink: 0,
            }}
          >
            <Player
              ref={playerRef}
              component={Slideshow}
              inputProps={data}
              durationInFrames={project.video.totalFrames}
              fps={project.video.fps}
              compositionWidth={project.video.width}
              compositionHeight={project.video.height}
              controls
              style={{ width: "100%", height: "100%" }}
            />
            {editing === "title" && layout && project.overlay.enabled && (
              <div
                className="overlay-selection"
                role="group"
                tabIndex={0}
                aria-label="Khung điều chỉnh tiêu đề"
                style={{
                  left: layout.x + "%",
                  top: layout.y + "%",
                  width: layout.width + "%",
                  height: layout.height + "%",
                }}
                onPointerDown={(e) => start(e, "move")}
                onPointerMove={move}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                onKeyDown={(e) => {
                  const delta = e.shiftKey ? 2 : 0.5;
                  if (
                    [
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                    onLayout(
                      normalizeOverlayLayout({
                        ...layout,
                        x:
                          layout.x +
                          (e.key === "ArrowRight"
                            ? delta
                            : e.key === "ArrowLeft"
                              ? -delta
                              : 0),
                        y:
                          layout.y +
                          (e.key === "ArrowDown"
                            ? delta
                            : e.key === "ArrowUp"
                              ? -delta
                              : 0),
                      }),
                    );
                  }
                }}
              >
                <span className="selection-label">Kéo để di chuyển</span>
                <button
                  type="button"
                  className="resize-handle"
                  aria-label="Đổi kích thước tiêu đề"
                  onPointerDown={(e) => start(e, "resize")}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    move(e);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    drag.current = null;
                  }}
                />
              </div>
            )}
            {editing === "subscribe" &&
              subscribeBox &&
              subscribeClip &&
              subscribeAsset &&
              subscribeVisible && (
                <div
                  className="overlay-selection subscribe-selection"
                  role="group"
                  tabIndex={0}
                  aria-label="Khung điều chỉnh Subscribe"
                  data-subscribe-id={subscribeClip.id}
                  style={{
                    left: subscribeBox.x + "%",
                    top: subscribeBox.y + "%",
                    width: subscribeBox.width + "%",
                    height: subscribeBox.height + "%",
                  }}
                  onPointerDown={(e) => startSubscribe(e, "move")}
                  onPointerMove={moveSubscribe}
                  onPointerUp={finishSubscribe}
                  onPointerCancel={finishSubscribe}
                  onKeyDown={(e) => {
                    if (
                      busy ||
                      ![
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(e.key)
                    )
                      return;
                    e.preventDefault();
                    e.stopPropagation();
                    playerRef.current?.pause();
                    const delta = e.shiftKey ? 2 : 0.5;
                    onSubscribeChange(
                      transformSubscribeClip(
                        subscribeClip,
                        subscribeAsset,
                        project.video.width,
                        project.video.height,
                        e.key === "ArrowRight"
                          ? delta
                          : e.key === "ArrowLeft"
                            ? -delta
                            : 0,
                        e.key === "ArrowDown"
                          ? delta
                          : e.key === "ArrowUp"
                            ? -delta
                            : 0,
                      ),
                      true,
                    );
                  }}
                >
                  <span className="selection-label">
                    Subscribe · Kéo để di chuyển
                  </span>
                  <button
                    type="button"
                    className="resize-handle"
                    aria-label="Đổi kích thước Subscribe trên preview"
                    onPointerDown={(e) => startSubscribe(e, "resize")}
                    onPointerMove={(e) => {
                      e.stopPropagation();
                      moveSubscribe(e);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      finishSubscribe();
                    }}
                    onPointerCancel={(e) => {
                      e.stopPropagation();
                      finishSubscribe();
                    }}
                  />
                </div>
              )}
          </div>
        ) : (
          <div className="preview-empty">
            <span>▷</span>
            <h2>Từ ảnh tĩnh đến câu chuyện sống động</h2>
            <p>
              Thêm ảnh và voice. Studio tự chia thời gian,
              <br />
              thêm chuyển động và chuyển cảnh cho bạn.
            </p>
          </div>
        )}
      </div>
      <div className="preview-footer">
        <span>
          {time(frame)} / {time(project?.video.totalFrames ?? 0)}
        </span>
        <span>
          {editing === "subscribe"
            ? "Kéo sub hoặc kéo góc để đổi kích thước · Tự lưu khi thả chuột"
            : editing
              ? "Kéo góc để đổi kích thước · Phím mũi tên để căn chỉnh"
              : "Space: phát / dừng"}
        </span>
      </div>
    </article>
  );
}
