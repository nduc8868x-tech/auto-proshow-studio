import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import type { SceneProps } from "../src/shared/project";
import {
  subscribeFrameIndex,
  subscribeGeometry,
} from "../src/shared/subscribe";
export function SubscribeLayer({ project, urls }: SceneProps) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 30 }}>
      {project.subscribeClips.map((clip) => {
        if (
          frame < clip.startFrame ||
          frame >= clip.startFrame + clip.durationFrames
        )
          return null;
        const asset = project.subscribeAssets.find(
          (a) => a.id === clip.assetId,
        );
        if (!asset) return null;
        const index = subscribeFrameIndex(
          asset.frameDurationsMs,
          frame - clip.startFrame,
          project.video.fps,
          clip.loop,
        );
        const g = subscribeGeometry(
          clip,
          asset,
          project.video.width,
          project.video.height,
        );
        return (
          <Img
            key={clip.id}
            src={urls[asset.id + "-frame-" + index]}
            style={{
              position: "absolute",
              left: g.x + "%",
              top: g.y + "%",
              width: g.width + "%",
              height: g.height + "%",
              objectFit: "contain",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
