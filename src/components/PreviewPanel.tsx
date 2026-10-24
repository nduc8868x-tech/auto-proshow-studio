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
  normalizeOverlayLayout,
  type OverlayLayout,
} from "../shared/overlay-layout";
export function PreviewPanel({
  data,
  playerRef,
  frame,
  onLayout,
}: {
  data: SceneProps | null;
  playerRef: RefObject<PlayerRef | null>;
  frame: number;
  onLayout: (layout: OverlayLayout) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null),
    [size, setSize] = useState({ width: 640, height: 360 }),
    [editing, setEditing] = useState(false);
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
    setEditing(false);
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
    if (!layout) return;
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
          disabled={!project?.clips.length || !project.overlay.enabled}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Xong chỉnh vị trí" : "Chỉnh vị trí"}
        </button>
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
            {editing && layout && project.overlay.enabled && (
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
          {editing
            ? "Kéo góc để đổi kích thước · Phím mũi tên để căn chỉnh"
            : "Space: phát / dừng"}
        </span>
      </div>
    </article>
  );
}
