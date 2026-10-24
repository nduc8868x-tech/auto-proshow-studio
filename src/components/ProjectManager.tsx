import { useEffect, useRef, useState } from "react";
import type { ProjectSummary, QueueState } from "../app-api";
const api = window.appAPI;
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}
export function ProjectManager({
  activeId,
  queue,
  onClose,
  onOpen,
  onCreate,
  onDeleted,
  onRenamed,
}: {
  activeId?: string;
  queue: QueueState;
  onClose: () => void;
  onOpen: (id: string) => Promise<void>;
  onCreate: () => Promise<void>;
  onDeleted: (id: string) => Promise<void>;
  onRenamed: (id: string, name: string) => Promise<void>;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("recent"),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [renaming, setRenaming] = useState<string | null>(null),
    [name, setName] = useState("");
  const dialog = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    void api
      .list()
      .then((p) => {
        if (live) setProjects(p);
      })
      .catch((e) => {
        if (live) setError(String(e.message));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    search.current?.focus();
    return () => previous?.focus();
  }, []);
  async function action(id: string, task: () => Promise<void>) {
    setBusy(id);
    setError("");
    try {
      await task();
      setProjects(await api.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }
  const normalized = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  const shown = projects
    .filter((p) => normalized(p.name).includes(normalized(query)))
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "vi", { numeric: true })
        : sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  const duration = (seconds: number) =>
    String(Math.floor(seconds / 60)) +
    ":" +
    String(Math.floor(seconds % 60)).padStart(2, "0");
  return (
    <div className="modal-backdrop">
      <div
        ref={dialog}
        className="project-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="projects-title"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) {
            e.stopPropagation();
            onClose();
          }
          if (e.key === "Tab") {
            const nodes = Array.from(
              dialog.current!.querySelectorAll<HTMLElement>(
                "button:not(:disabled),input,select",
              ),
            );
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            }
            if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="manager-header">
          <div>
            <small>KHÔNG GIAN SÁNG TẠO</small>
            <h2 id="projects-title">
              Dự án của bạn <span>{projects.length}</span>
            </h2>
            <p>Mở dự án, đổi tên và sắp xếp công việc ở một nơi.</p>
          </div>
          <button
            disabled={!!busy}
            onClick={onClose}
            aria-label="Đóng quản lý dự án"
          >
            ✕
          </button>
        </div>
        <div className="manager-toolbar">
          <input
            ref={search}
            aria-label="Tìm dự án"
            placeholder="Tìm theo tên dự án…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Sắp xếp dự án"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Mới chỉnh sửa</option>
            <option value="name">Tên A–Z</option>
            <option value="oldest">Tạo lâu nhất</option>
          </select>
          <button
            className="primary"
            disabled={!!busy}
            onClick={() => void action("new", onCreate)}
          >
            ＋ Dự án mới
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div
          className="project-cards project-rows"
          aria-label="Danh sách dự án"
        >
          {shown.map((project) => {
            const locked = queue.jobs.some(
              (j) =>
                j.projectId === project.id &&
                !["completed", "cancelled", "failed"].includes(j.status),
            );
            return (
              <article
                className={
                  "project-card project-row " +
                  (project.id === activeId ? "current" : "")
                }
                key={project.id}
              >
                <button
                  className="project-cover"
                  aria-label={"Mở " + project.name}
                  disabled={!!busy}
                  onClick={() =>
                    void action(project.id, () => onOpen(project.id))
                  }
                >
                  {project.thumbnailUrl ? (
                    <img src={project.thumbnailUrl} alt="" loading="lazy" />
                  ) : (
                    <span>▧</span>
                  )}
                </button>
                <div className="project-card-body">
                  {renaming === project.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void action(project.id, async () => {
                          const p = await api.renameProject(project.id, name);
                          await onRenamed(p.id, p.name);
                          setRenaming(null);
                        });
                      }}
                    >
                      <input
                        aria-label={"Tên mới của " + project.name}
                        autoFocus
                        maxLength={120}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <div>
                        <button disabled={!!busy || !name.trim()} type="submit">
                          Lưu tên
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => setRenaming(null)}
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  ) : (
                    <h3 title={project.name}>
                      {project.name}{" "}
                      {project.id === activeId && (
                        <span className="project-current">Đang mở</span>
                      )}
                    </h3>
                  )}
                  <p>
                    {project.imageCount} ảnh <span>·</span> {project.width} ×{" "}
                    {project.height}
                  </p>
                  {locked && (
                    <small className="project-locked">
                      ● Đang chờ / xuất video
                    </small>
                  )}
                </div>
                <div className="project-row-duration">
                  <small>Thời lượng</small>
                  <strong>{duration(project.durationSeconds)}</strong>
                </div>
                <div className="project-row-times">
                  <small>
                    Tạo:{" "}
                    <time dateTime={project.createdAt}>
                      {dateLabel(project.createdAt)}
                    </time>
                  </small>
                  <small>
                    Sửa:{" "}
                    <time dateTime={project.updatedAt}>
                      {dateLabel(project.updatedAt)}
                    </time>
                  </small>
                </div>
                <div className="project-actions">
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      void action(project.id, () => onOpen(project.id))
                    }
                  >
                    Mở
                  </button>
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      setRenaming(project.id);
                      setName(project.name);
                    }}
                  >
                    Đổi tên
                  </button>
                  <button
                    className="danger"
                    disabled={!!busy || locked}
                    title={
                      locked
                        ? "Hủy các video chờ/xuất trước khi xóa"
                        : "Chuyển dự án vào Thùng rác"
                    }
                    onClick={() =>
                      void action(project.id, async () => {
                        const result = await api.deleteProject(project.id);
                        if (result.deleted) await onDeleted(project.id);
                      })
                    }
                  >
                    Xóa
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {loading && (
          <p className="projects-empty" role="status">
            Đang tải dự án…
          </p>
        )}
        {!loading && !shown.length && (
          <div className="projects-empty">
            <span>▧</span>
            <h3>
              {projects.length ? "Không tìm thấy dự án" : "Chưa có dự án"}
            </h3>
            <p>
              {projects.length
                ? "Thử tìm một tên khác."
                : "Tạo dự án mới để bắt đầu với ảnh và voice."}
            </p>
          </div>
        )}
        <div className="manager-footer">
          Thư mục dự án bị xóa được chuyển vào Thùng rác. File nguồn và video
          lưu bên ngoài thư mục dự án được giữ nguyên.
        </div>
      </div>
    </div>
  );
}
