import { Img } from "remotion";
export function BlurredBackground({
  src,
  width,
  height,
  blur,
  scale,
  prepared,
}: {
  src: string;
  width: number;
  height: number;
  blur: number;
  scale: number;
  prepared?: { url: string; padding: number };
}) {
  const padding = prepared?.padding ?? 0;
  return (
    <Img
      src={prepared?.url ?? src}
      style={{
        position: "absolute",
        left: -padding,
        top: -padding,
        width: width + padding * 2,
        height: height + padding * 2,
        objectFit: "cover",
        filter: prepared ? undefined : `blur(${blur}px)`,
        transform: `scale(${scale})`,
        willChange: "transform",
      }}
    />
  );
}
