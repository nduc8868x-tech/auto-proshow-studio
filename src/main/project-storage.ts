import { lstat, realpath, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { projectSchema } from "../shared/project";
export async function verifiedProjectFolder(root: string, id: string) {
  z.string().uuid().parse(id);
  const canonicalRoot = await realpath(root),
    target = path.join(canonicalRoot, id),
    info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw Error("Thư mục dự án không hợp lệ");
  const actual = await realpath(target);
  if (
    path.dirname(actual).toLowerCase() !== canonicalRoot.toLowerCase() ||
    path.basename(actual).toLowerCase() !== id.toLowerCase()
  )
    throw Error("Thư mục nằm ngoài vùng dự án");
  const project = projectSchema.parse(
    JSON.parse(await readFile(path.join(actual, "project.json"), "utf8")),
  );
  if (project.id !== id) throw Error("ID dự án không khớp");
  return { folder: actual, project };
}
