import { Img } from "remotion";
import type { SceneProps } from "../src/shared/project";
import {
  overlayGeometry,
  defaultOverlayLayout,
} from "../src/shared/overlay-layout";
export function TitleBanner({ project, urls }: SceneProps) {
  const overlay = project.overlay;
  if (!overlay?.enabled) return null;
  const g = overlayGeometry(
    project.video.width,
    project.video.height,
    overlay.layout ?? defaultOverlayLayout,
    !!overlay.logo,
    overlay.title,
  );
  return (
    <div
      data-testid="title-banner"
      style={{
        position: "absolute",
        left: g.x,
        top: g.y,
        width: g.width,
        height: g.height,
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: (g.height - g.bandHeight) / 2,
          height: g.bandHeight,
          background: "rgba(255,255,255,.97)",
          boxShadow: "0 2px 5px #0004",
          display: "flex",
          alignItems: "center",
          paddingLeft: g.padding,
          paddingRight: g.logoSize + g.padding,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: "Segoe UI, Arial, sans-serif",
            fontWeight: 900,
            color: "#ee3109",
            fontSize: g.fontSize,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            letterSpacing: -g.fontSize * 0.025,
            width: g.textWidth,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {overlay.title}
        </div>
      </div>
      {overlay.logo && urls[overlay.logo.id] && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: (g.height - g.logoSize) / 2,
            width: g.logoSize,
            height: g.logoSize,
            background: "white",
            borderRadius: project.video.height * 0.006,
            padding: g.logoSize * 0.06,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={urls[overlay.logo.id]}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}
