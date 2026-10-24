import { motionTransform } from "../src/shared/motion-transform";
import { TitleBanner } from "./TitleBanner";
import { BlurredBackground } from "./BlurredBackground";
import { SubscribeLayer } from "./SubscribeLayer";
import React from "react";
import { AbsoluteFill, Audio, Img, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import {
  chooseFitMode,
  type Clip,
  type SceneProps,
} from "../src/shared/project";
export function ImageScene({
  project,
  urls,
  backgrounds,
  clip,
}: SceneProps & { clip: Clip }) {
  const frame = useCurrentFrame(),
    image = project.images.find((i) => i.id === clip.imageId)!;
  const { width: w, height: h } = project.video,
    v = project.visual,
    selected = clip.fitOverride ?? v.fitMode,
    mode =
      selected === "auto"
        ? chooseFitMode(image.width, image.height, w, h)
        : selected;
  const safe = mode !== "cover",
    m = motionTransform(
      clip.motion,
      frame,
      clip.durationFrames,
      clip.motionSpeed ?? v.motionSpeed ?? 1,
      safe,
      w,
      h,
      image.width,
      image.height,
    );
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#080b12" }}>
      {mode === "contain-blur" && (
        <>
          <BlurredBackground
            src={urls[image.id]}
            width={w}
            height={h}
            blur={(v.blurPx * h) / 1080}
            scale={v.backgroundScale + 0.02 * m.rate * m.progress}
            prepared={backgrounds?.[image.id]}
          />
          <AbsoluteFill
            style={{ background: "black", opacity: v.backgroundDarkness }}
          />
        </>
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img
          src={urls[image.id]}
          style={{
            width: safe ? m.fw : w,
            height: safe ? m.fh : h,
            objectFit: safe ? "contain" : "cover",
            transform: m.transform,
            willChange: "transform",
            borderRadius: v.foregroundRadiusPx,
            boxShadow:
              safe && v.foregroundShadow ? "0 10px 45px #0009" : undefined,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
export const Slideshow: React.FC<SceneProps> = ({
  project,
  urls,
  backgrounds,
}) => {
  const parts: React.ReactNode[] = [];
  project.clips.forEach((clip, index) => {
    if (index > 0 && clip.transitionInFrames > 0) {
      const timing = linearTiming({
          durationInFrames: clip.transitionInFrames,
        }),
        key = "t" + clip.id;
      parts.push(
        clip.transitionIn === "slide-left" ? (
          <TransitionSeries.Transition
            key={key}
            presentation={slide({ direction: "from-right" })}
            timing={timing}
          />
        ) : clip.transitionIn === "slide-right" ? (
          <TransitionSeries.Transition
            key={key}
            presentation={slide({ direction: "from-left" })}
            timing={timing}
          />
        ) : clip.transitionIn === "wipe" ? (
          <TransitionSeries.Transition
            key={key}
            presentation={wipe({ direction: "from-left" })}
            timing={timing}
          />
        ) : (
          <TransitionSeries.Transition
            key={key}
            presentation={fade()}
            timing={timing}
          />
        ),
      );
    }
    parts.push(
      <TransitionSeries.Sequence
        key={clip.id}
        durationInFrames={clip.durationFrames}
      >
        <ImageScene
          project={project}
          urls={urls}
          backgrounds={backgrounds}
          clip={clip}
        />
      </TransitionSeries.Sequence>,
    );
  });
  return (
    <AbsoluteFill style={{ background: "#080b12" }}>
      <TransitionSeries>{parts}</TransitionSeries>
      <TitleBanner project={project} urls={urls} />
      <SubscribeLayer project={project} urls={urls} />
      {project.voice && urls[project.voice.id] && (
        <Audio src={urls[project.voice.id]} />
      )}
    </AbsoluteFill>
  );
};
