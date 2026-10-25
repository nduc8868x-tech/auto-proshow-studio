import { projectSchema, validateTimeline, type Project } from "./project";
import { subscribeFramePath } from "./subscribe";
export function planProjectCopy(
  source: Project,
  newId: string,
  makeId: () => string,
  now = new Date().toISOString(),
) {
  const project = structuredClone(source);
  const files: { source: string; target: string }[] = [];
  const ids = new Map<string, string>();
  for (const asset of [
    ...project.images,
    ...(project.voice ? [project.voice] : []),
    ...(project.overlay.logo ? [project.overlay.logo] : []),
  ]) {
    const old = asset.id;
    const mapped = ids.get(old);
    const id = mapped ?? makeId();
    ids.set(old, id);
    const ext = asset.relativePath.slice(asset.relativePath.lastIndexOf("."));
    const relativePath = `media/${"thumbnailPath" in asset ? "images" : "audio"}/${id}${ext}`;
    if (!mapped)
      files.push({ source: asset.relativePath, target: relativePath });
    asset.id = id;
    asset.relativePath = relativePath;
    if ("thumbnailPath" in asset) {
      const thumbnailPath = `thumbnails/${id}.png`;
      if (!mapped)
        files.push({ source: asset.thumbnailPath, target: thumbnailPath });
      asset.thumbnailPath = thumbnailPath;
    }
  }
  for (const clip of project.clips) {
    clip.imageId = ids.get(clip.imageId)!;
    clip.id = "clip-" + clip.imageId;
  }
  const templates = new Map<string, string>();
  for (const asset of project.subscribeAssets) {
    const old = asset.id,
      id = makeId();
    templates.set(old, id);
    asset.id = id;
    asset.frameDurationsMs.forEach((_, index) =>
      files.push({
        source: subscribeFramePath(old, index),
        target: subscribeFramePath(id, index),
      }),
    );
  }
  for (const clip of project.subscribeClips) {
    clip.id = makeId();
    clip.assetId = templates.get(clip.assetId)!;
  }
  project.id = newId;
  project.name = source.name.slice(0, 109) + " — Bản sao";
  project.createdAt = now;
  project.updatedAt = now;
  const checked = projectSchema.parse(project);
  validateTimeline(checked);
  return { project: checked, files };
}
