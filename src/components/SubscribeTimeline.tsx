import { useRef, useState, type PointerEvent } from "react";
import type { Project } from "../shared/project";
import {
  fitSubscribeClip,
  pasteSubscribeClip,
  subscribeGeometry,
  type SubscribeClip,
} from "../shared/subscribe";
export function SubscribeTimeline({
  project,
  frame,
  busy,
  onAdd,
  onChange,
  onDelete,
  onSeek,
  onInsert,
  selectedId,
  onSelect,
}: {
  project: Project;
  frame: number;
  busy: boolean;
  onAdd: (source: "builtin" | "file", removeGreen: boolean) => void;
  onChange: (clip: SubscribeClip, commit: boolean) => void;
  onDelete: (id: string) => void;
  onSeek: (frame: number) => void;
  onInsert: (clip: SubscribeClip) => Promise<boolean>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = selectedId,
    setSelected = onSelect;
  const [removeGreen, setRemoveGreen] = useState(true),
    [copied, setCopied] = useState<SubscribeClip | null>(null),
    [message, setMessage] = useState("");
  const pasting = useRef(false);
  const drag = useRef<{
    x: number;
    width: number;
    clip: SubscribeClip;
    last: SubscribeClip;
    resize: boolean;
    moved: boolean;
  } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const clip = project.subscribeClips.find((c) => c.id === selected);
  const asset = project.subscribeAssets.find((a) => a.id === clip?.assetId);
  const fps = project.video.fps,
    total = Math.max(1, project.video.totalFrames);
  const canPaste =
    !!copied &&
    !busy &&
    project.clips.length > 0 &&
    project.subscribeClips.length < 100 &&
    project.subscribeAssets.some((a) => a.id === copied.assetId);
  function copy() {
    if (!clip || busy) return;
    setCopied({ ...clip });
    setMessage("Đã sao chép Subscribe. Đặt playhead rồi bấm Dán hoặc Ctrl+V.");
  }
  async function paste() {
    if (!canPaste || !copied || pasting.current) return;
    pasting.current = true;
    const next = pasteSubscribeClip(copied, crypto.randomUUID(), frame, total);
    try {
      if (await onInsert(next)) {
        setSelected(next.id);
        setMessage(
          "Đã dán Subscribe tại " +
            (next.startFrame / fps).toFixed(2) +
            " giây.",
        );
      }
    } finally {
      pasting.current = false;
    }
  }
  function start(
    e: PointerEvent<HTMLElement>,
    item: SubscribeClip,
    resize: boolean,
  ) {
    if (busy) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    setSelected(item.id);
    onSeek(item.startFrame);
    drag.current = {
      x: e.clientX,
      width: track.current!.getBoundingClientRect().width,
      clip: { ...item },
      last: item,
      resize,
      moved: false,
    };
  }
  function move(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const delta = Math.round(((e.clientX - d.x) * total) / d.width);
    d.moved ||= Math.abs(e.clientX - d.x) > 2;
    d.last = fitSubscribeClip(
      {
        ...d.clip,
        ...(d.resize
          ? { durationFrames: Math.max(1, d.clip.durationFrames + delta) }
          : {
              startFrame: Math.max(
                0,
                Math.min(
                  total - d.clip.durationFrames,
                  d.clip.startFrame + delta,
                ),
              ),
            }),
      },
      total,
    );
    onChange(d.last, false);
  }
  function finish() {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) onChange(d.last, true);
  }
  function patch(update: Partial<SubscribeClip>, commit = false) {
    if (!clip || !asset) return;
    const next = fitSubscribeClip({ ...clip, ...update }, total);
    const geometry = subscribeGeometry(
      next,
      asset,
      project.video.width,
      project.video.height,
    );
    onChange(
      {
        ...next,
        x: geometry.x,
        y: geometry.y,
        width: Math.max(5, geometry.width),
      },
      commit,
    );
  }
  return (
    <div
      className="subscribe-editor"
      onKeyDown={(e) => {
        if (
          !(e.ctrlKey || e.metaKey) ||
          e.altKey ||
          e.shiftKey ||
          (e.target as HTMLElement).closest(
            "input,textarea,select,[contenteditable]:not([contenteditable='false'])",
          )
        )
          return;
        if (e.key.toLowerCase() === "c" && clip && !busy) {
          e.preventDefault();
          e.stopPropagation();
          copy();
        }
        if (e.key.toLowerCase() === "v" && canPaste) {
          e.preventDefault();
          e.stopPropagation();
          void paste();
        }
      }}
    >
      <div className="subscribe-heading">
        <div>
          <b>Template Subscribe</b>
          <small>
            Thêm tại {(frame / fps).toFixed(2)} giây · Kéo đoạn để đổi thời
            điểm, kéo mép phải để đổi thời lượng
          </small>
        </div>
        <button
          disabled={busy || !project.clips.length}
          onClick={() => onAdd("builtin", true)}
        >
          ＋ Mẫu Subscribe
        </button>
        <button
          disabled={busy || !project.clips.length}
          onClick={() => onAdd("file", removeGreen)}
        >
          Nhập GIF khác…
        </button>
        <button
          aria-label="Sao chép Subscribe"
          disabled={busy || !clip}
          onClick={copy}
          title="Ctrl+C khi đang chọn đoạn Subscribe"
        >
          Sao chép
        </button>
        <button
          aria-label="Dán Subscribe tại playhead"
          disabled={!canPaste}
          onClick={() => void paste()}
          title="Ctrl+V · Dán tại playhead, giữ vị trí/kích thước và kiểu lặp"
        >
          Dán tại playhead
        </button>
      </div>
      <div className="subscribe-tools">
        <label>
          Đoạn Subscribe{" "}
          <select
            aria-label="Chọn đoạn Subscribe"
            value={selected ?? ""}
            disabled={busy || !project.subscribeClips.length}
            onChange={(e) => {
              const selectedClip = project.subscribeClips.find(
                (c) => c.id === e.target.value,
              );
              if (selectedClip) {
                setSelected(selectedClip.id);
                onSeek(selectedClip.startFrame);
              }
            }}
          >
            <option value="">Chọn đoạn…</option>
            {project.subscribeClips.map((c, i) => (
              <option key={c.id} value={c.id}>
                Subscribe {i + 1} · {(c.startFrame / fps).toFixed(2)}–
                {((c.startFrame + c.durationFrames) / fps).toFixed(2)}s
              </option>
            ))}
          </select>
        </label>
        <small>
          Bấm chỗ trống để đặt playhead · Ctrl+C sao chép · Ctrl+V dán trong
          track này
        </small>
      </div>
      {message && (
        <p className="subscribe-message" role="status">
          {message}
        </p>
      )}
      <label className="subscribe-key">
        <input
          type="checkbox"
          checked={removeGreen}
          disabled={busy}
          onChange={(e) => setRemoveGreen(e.target.checked)}
        />
        Tách nền xanh khi nhập GIF khác
      </label>
      <div
        className="subscribe-track"
        ref={track}
        aria-label="Track Template Subscribe"
        tabIndex={0}
        onPointerDown={(e) => {
          if (busy || (e.target as HTMLElement).closest(".subscribe-clip"))
            return;
          e.currentTarget.focus({ preventScroll: true });
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek(
            Math.max(
              0,
              Math.min(
                total - 1,
                Math.round(((e.clientX - rect.x) * total) / rect.width),
              ),
            ),
          );
        }}
      >
        {!project.subscribeClips.length && (
          <span className="subscribe-empty">
            Chưa có template · Bấm “Mẫu Subscribe” để chèn hiệu ứng đăng ký đã
            tách nền
          </span>
        )}
        {project.subscribeClips.map((item, index) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={"Subscribe " + (index + 1)}
            data-subscribe-id={item.id}
            className={
              "subscribe-clip " + (item.id === selected ? "active" : "")
            }
            style={{
              left: (item.startFrame * 100) / total + "%",
              width: (item.durationFrames * 100) / total + "%",
              top: 8,
              zIndex: item.id === selected ? 3 : 1,
            }}
            onPointerDown={(e) => start(e, item, false)}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(item.id);
                onSeek(item.startFrame);
              }
            }}
            title={`${(item.startFrame / fps).toFixed(2)}s → ${((item.startFrame + item.durationFrames) / fps).toFixed(2)}s`}
          >
            <span>▶ Subscribe {index + 1}</span>
            <button
              className="subscribe-resize"
              aria-label={"Đổi thời lượng Subscribe " + (index + 1)}
              onPointerDown={(e) => start(e, item, true)}
              onPointerMove={(e) => {
                e.stopPropagation();
                move(e);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                finish();
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                finish();
              }}
            />
          </div>
        ))}
        <div
          className="subscribe-playhead"
          style={{ left: Math.min(100, (frame * 100) / total) + "%" }}
        />
      </div>
      {clip && asset && (
        <div className="subscribe-inspector">
          <label>
            Bắt đầu (giây)
            <input
              aria-label="Thời điểm Subscribe"
              type="number"
              min={0}
              max={(total - 1) / fps}
              step={1 / fps}
              disabled={busy}
              value={Number((clip.startFrame / fps).toFixed(3))}
              onChange={(e) => {
                if (Number.isFinite(e.target.valueAsNumber))
                  patch({
                    startFrame: Math.round(e.target.valueAsNumber * fps),
                  });
              }}
            />
          </label>
          <label>
            Thời lượng (giây)
            <input
              aria-label="Thời lượng Subscribe"
              type="number"
              min={1 / fps}
              max={(total - clip.startFrame) / fps}
              step={1 / fps}
              disabled={busy}
              value={Number((clip.durationFrames / fps).toFixed(3))}
              onChange={(e) => {
                if (Number.isFinite(e.target.valueAsNumber))
                  patch({
                    durationFrames: Math.max(
                      1,
                      Math.round(e.target.valueAsNumber * fps),
                    ),
                  });
              }}
            />
          </label>
          {(
            [
              ["x", "Ngang (%)", 0, 100],
              ["y", "Dọc (%)", 0, 100],
              ["width", "Kích thước (%)", 5, 100],
            ] as const
          ).map(([key, label, min, max]) => (
            <label key={key}>
              {label}
              <input
                aria-label={"Subscribe " + label}
                type="number"
                min={min}
                max={max}
                step={0.5}
                value={Number(clip[key].toFixed(2))}
                disabled={busy}
                onChange={(e) => {
                  if (Number.isFinite(e.target.valueAsNumber))
                    patch({
                      [key]: Math.max(
                        min,
                        Math.min(max, e.target.valueAsNumber),
                      ),
                    });
                }}
              />
            </label>
          ))}
          <label className="subscribe-loop">
            <input
              type="checkbox"
              disabled={busy}
              checked={clip.loop}
              onChange={(e) => patch({ loop: e.target.checked }, true)}
            />
            Lặp animation
          </label>
          <button disabled={busy} onClick={() => patch({}, true)}>
            Lưu chỉnh sửa
          </button>
          <button
            className="danger"
            disabled={busy}
            onClick={() => onDelete(clip.id)}
          >
            Xóa đoạn
          </button>
          <small>
            {asset.frameDurationsMs.length} frame · Không lặp: giữ frame cuối
            đến hết đoạn. Sửa vị trí/kích thước để xem ngay trên preview, rồi
            bấm Lưu chỉnh sửa.
          </small>
        </div>
      )}
    </div>
  );
}
