import type { Project } from "../shared/project";
import {
  defaultOverlayLayout,
  normalizeOverlayLayout,
  type OverlayLayout,
} from "../shared/overlay-layout";
export function TitleLayoutControls({
  overlay,
  onChange,
}: {
  overlay: Project["overlay"];
  onChange: (overlay: Project["overlay"]) => void;
}) {
  const layout = overlay.layout;
  const edit = (patch: Partial<OverlayLayout>) =>
    onChange({
      ...overlay,
      layout: normalizeOverlayLayout({ ...layout, ...patch }),
    });
  return (
    <div className="title-layout-controls">
      <h4>Vị trí & kích thước tiêu đề</h4>
      <div className="placement-presets">
        {[
          ["Trên", 7],
          ["Giữa", (100 - layout.height) / 2],
          ["Dưới", 100 - layout.height - 7],
        ].map(([label, y]) => (
          <button
            type="button"
            key={label}
            onClick={() => edit({ y: Number(y) })}
          >
            {label}
          </button>
        ))}
      </div>
      {(
        [
          ["x", "Ngang (X)", 0, 100 - layout.width, 0.1, "%"],
          ["y", "Dọc (Y)", 0, 100 - layout.height, 0.1, "%"],
          ["width", "Chiều rộng dải", 10, 100, 0.5, "%"],
          ["height", "Chiều cao dải", 5, 40, 0.5, "%"],
          ["fontSize", "Cỡ chữ (chuẩn 1080p)", 8, 180, 1, "px"],
        ] as const
      ).map(([key, label, min, max, step, unit]) => (
        <label key={key}>
          {label}
          <span className="value">
            {Number(layout[key].toFixed(1))}
            {unit}
          </span>
          <input
            aria-label={label}
            type="range"
            min={min}
            max={Math.max(min, max)}
            step={step}
            value={layout[key]}
            onChange={(e) => edit({ [key]: Number(e.target.value) })}
          />
        </label>
      ))}
      <label className="check">
        <input
          type="checkbox"
          checked={layout.autoFit}
          onChange={(e) => edit({ autoFit: e.target.checked })}
        />
        Tự co chữ khi tiêu đề dài
      </label>
      <button
        type="button"
        onClick={() =>
          onChange({ ...overlay, layout: { ...defaultOverlayLayout } })
        }
      >
        Đặt lại bố cục
      </button>
      <small className="hint">
        Bấm “Chỉnh vị trí” trên preview để kéo dải tiêu đề hoặc kéo góc đổi kích
        thước.
      </small>
    </div>
  );
}
