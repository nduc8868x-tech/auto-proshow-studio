import { Composition } from "remotion";
import { Slideshow } from "./Slideshow";
import { newProject, type SceneProps } from "../src/shared/project";
const defaults: SceneProps = {
  project: newProject("00000000-0000-4000-8000-000000000000"),
  urls: {},
};
export const RemotionRoot = () => (
  <Composition
    id="AutoSlideshow"
    component={Slideshow}
    durationInFrames={1}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={defaults}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, props.project.video.totalFrames),
      fps: props.project.video.fps,
      width: props.project.video.width,
      height: props.project.video.height,
    })}
  />
);
