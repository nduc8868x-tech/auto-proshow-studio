# AUTO PROSHOW STUDIO — ĐẶC TẢ XÂY DỰNG CHO CODEX

> **Phiên bản tài liệu:** 1.0 — 23/10/2026  
> **Ngôn ngữ sản phẩm:** Tiếng Việt (UI); mã nguồn, tên file, biến: tiếng Anh  
> **Nền tảng đích:** Windows 10/11 x64  
> **Cách phát triển:** React + TypeScript + Vite (hot reload trong Electron)  
> **Cách phân phối:** Windows EXE/installer bằng Electron Forge  
> **Render:** Remotion + FFmpeg/compositor  
> **Chế độ biên tập:** **KHÔNG AI**; tự chia đều ảnh theo voice, tự áp motion + transition; ảnh sai tỉ lệ tự dùng nền mờ lấy từ chính ảnh đó  
> **Mục đích:** Tài liệu này là *đầu bài triển khai*, không phải bài giới thiệu. Codex phải đọc từ đầu đến cuối và tạo **mã nguồn chạy được**, không chỉ mô tả.

---

## 0. LỆNH CHO CODEX — ĐỌC PHẦN NÀY TRƯỚC

Bạn là senior full-stack/desktop engineer. Hãy xây dựng **Auto ProShow Studio** theo đặc tả này trong repository hiện tại.

### Nguyên tắc thực thi

1. **Kiểm tra repository** và công cụ có sẵn trước khi tạo file. Nếu repo đã có code, **không ghi đè/xóa các thay đổi không liên quan**. Nếu thư mục trống, dùng **Remotion + Electron template chính thức** làm nền tảng, rồi mở rộng; không tự tạo hệ thống đóng gói từ đầu khi đã có template phù hợp.
2. Tạo ứng dụng **hoạt động được**, không dừng ở wireframe, mock hoặc pseudo-code. Ưu tiên luồng xuyên suốt: **nhập ảnh + voice → timeline → preview → export MP4**.
3. Thực hiện lần lượt các phase 1–6 bên dưới. Sau mỗi phase phải chạy kiểm thử liên quan, sửa lỗi build/typecheck trước khi sang phase tiếp theo.
4. Dùng phiên bản package **tương thích tại thời điểm thực hiện**. Toàn bộ `remotion` và `@remotion/*` phải dùng **cùng một phiên bản được pin** theo hướng dẫn chính thức. Cam kết `package-lock.json`.
5. Không thêm AI, cloud, đăng nhập, dữ liệu người dùng online, watermark, phụ đề tự động, YouTube API hoặc thanh toán vào MVP.
6. Không dùng `Math.random()` trong thành phần render. Hiệu ứng được xác định một lần từ seed và lưu trong project.
7. Không render video dài ngay để kiểm thử. Tạo fixture ngắn 8–15 giây và 3–5 ảnh để chạy smoke test trước; kiểm thử 100–200 ảnh riêng khi luồng nhỏ đã chạy.
8. **Cố gắng hoàn thành toàn bộ chức năng trong scope.** Nếu có giới hạn thực tế, ưu tiên sản phẩm end-to-end, ghi rõ phần chưa hoàn thành bằng `TODO.md` chứ không giả vờ đã chạy.
9. Mỗi phase cập nhật `PROGRESS.md`: nội dung đã làm, lệnh đã chạy, kết quả, lỗi còn tồn đọng, bước tiếp theo. Không xác nhận 'pass' nếu chưa thực sự chạy.
10. Không tự hỏi người dùng các lựa chọn nhỏ; dùng mặc định trong đặc tả. Nếu có quyết định ảnh hưởng kiến trúc, nêu quyết định và lý do trong `docs/DECISIONS.md`.

### Kết quả cuối cùng bắt buộc

- Ứng dụng UI có thể mở được bằng `npm run dev`.
- Có build/package Windows: `npm run package:win` hoặc script tương đương được ghi trong README.
- Cho phép tạo dự án, nhập MP3/WAV + JPG/PNG/WebP, tạo timeline tự động.
- Preview có tiếng, đúng khung hình, motion và transition.
- **Ảnh lệch tỉ lệ dùng blurred background**, ảnh chính rõ ở giữa, **không bị kéo giãn**.
- Export MP4 H.264, AAC, đồng bộ voice; thanh tiến độ và hủy được render.
- Có unit tests, integration/smoke tests, README setup Windows và lệnh kiểm tra.
- Nếu hoàn thành EXE, phải test **bản packaged**, không chỉ test ở dev mode.

---

## 1. MỤC TIÊU SẢN PHẨM

Người dùng muốn đưa **1 voice** và **N hình ảnh** vào tool. Tool tự động:

1. Đọc metadata voice, lấy thời lượng.
2. Sắp xếp ảnh theo **natural filename order** (`1.jpg`, `2.jpg`, ..., `10.jpg`) hoặc thứ tự người dùng kéo thả.
3. Chia thời gian đều để **tổng video khớp voice**.
4. Áp các chuyển động như ProShow: `zoom-in`, `zoom-out`, `pan-left`, `pan-right`, `pan-up`, `pan-down`.
5. Áp các chuyển cảnh: `fade`, `slide-left`, `slide-right`, `wipe`; MVP có thể bắt đầu chỉ với `fade` rồi thêm 3 hiệu ứng còn lại.
6. Tự xử lý ảnh sai tỉ lệ bằng cách **blur chính ảnh ở background, giữ ảnh chính rõ nét ở giữa**.
7. Xem trước và sửa thứ tự ảnh / preset / fit mode.
8. Xuất `output.mp4` để tải/dùng tại máy.

### 1.1. Trường hợp sử dụng chính

- Voice dài 5–20 phút, 20–200 ảnh; tham chiếu mục tiêu, **không hứa hiệu năng trước khi benchmark**.
- Video YouTube ngang **1920×1080, 30 FPS, 16:9** mặc định.
- Có thể chọn **1080×1920, 30 FPS, 9:16** và 1280×720, 30 FPS cho xuất nhanh.
- Ảnh từ điện thoại, ảnh ngang/dọc, screenshot, JPG/PNG/WebP.
- Nội dung gốc trên máy, không tải lên Internet.

### 1.2. Ngoài scope MVP

Không làm timeline đa track tự do, không có keyframe editor kiểu Premiere, không có voice-to-text, không tự tìm ảnh Internet, không video input trong MVP, không âm nhạc nền tự tìm, không subtitle auto, không batch processing (đưa vào roadmap).

### 1.3. Thứ tự ưu tiên

`P0`: Import + audio duration + timeline frame-perfect + preview + blurred background + render MP4.  
`P1`: Presets + kéo thả ảnh + thay từng hiệu ứng + save/load + cancel/progress.  
`P2`: Cải tiến UI, keyboard shortcut, batch export, tối ưu hiệu suất, nhạc nền tùy chọn.

---

## 2. QUYẾT ĐỊNH KIẾN TRÚC

### 2.1. Chọn giải pháp

**Kiến trúc chính: Electron Forge + Vite + React + TypeScript + Remotion, không cần một Express server công khai.**

- **Electron Renderer**: React editor và `@remotion/player`.
- **Electron Preload**: bridge IPC định kiểu, allowlist method.
- **Electron Main**: filesystem, metadata, project persistence, render jobs, menu/dialog, path validation.
- **Remotion compositions**: preview và export dùng **cùng mã nguồn**, cùng dữ liệu timeline.
- **Remotion Renderer** trong main/worker Node: bundle composition, render H.264/AAC.
- **Local Media Server**: HTTP chỉ bind `127.0.0.1` trên cổng động, phục vụ **chỉ những asset đã import** cho preview và headless rendering. Dùng token/session-scoped URL, hỗ trợ HTTP Range cho voice. Không mở thư mục tùy ý.
- **FFprobe**: lấy thời lượng audio và kiểm tra MP4 xuất. Ưu tiên công cụ/binary cùng stack Remotion hoặc binary được bundle có giấy phép phù hợp.

**Vì sao không cần Express riêng trong bản EXE?** Logic hệ thống có thể chạy trong Electron main qua IPC; giảm một daemon phải bật thủ công. Chỉ media HTTP loopback dùng cổng cục bộ vì renderer/Chromium riêng cần tải ảnh và âm thanh bằng URL. Nếu sau này muốn hỗ trợ web browser độc lập, thêm adapter HTTP gọi cùng core service.

### 2.2. Nền tảng khởi tạo

Ưu tiên kiểm tra template chính thức:

- https://www.remotion.dev/templates/electron
- https://github.com/remotion-dev/template-electron
- Lệnh gợi ý: `npx create-video@latest --electron`

Template có Vite, Electron Forge, cơ chế render ở main process và đóng gói video bundle. **Hãy đọc README/script mới nhất của template trước khi viết script.**

### 2.3. Sơ đồ dữ liệu

```text
[React Editor]
  ├─ Import images/audio
  ├─ Controls, Preset, Timeline UI
  └─ Remotion Player  ←───────────┐
          │ typed window.appAPI   │ shared Composition + TimelineProps
          ▼                       │
[Preload IPC allowlist]            │
          │                       │
          ▼                       │
[Electron Main]                    │
  ├─ ProjectService               │
  ├─ MediaImportService           │
  ├─ MediaProbe/Thumbnail         │
  ├─ TimelineService ─────────────┘
  ├─ LoopbackMediaServer
  └─ RenderQueue (concurrency=1)
           └─ Remotion renderer
                 ├─ frames + transitions
                 ├─ voice audio
                 └─ final MP4
```

### 2.4. Ranh giới module

`shared` không import Electron, Node, filesystem. `engine` không gọi IPC, không ghi file. `main` không chứa JSX giao diện. `renderer` không truy cập trực tiếp `fs`, `child_process`, `ipcRenderer`.

---

## 3. CẤU TRÚC THƯ MỤC ĐÍCH

Tên dự án: `auto-proshow-studio`.

```text
auto-proshow-studio/
├── src/
│   ├── main/
│   │   ├── index.ts                 # Electron app lifecycle
│   │   ├── windows/createWindow.ts
│   │   ├── ipc/registerHandlers.ts
│   │   ├── ipc/validateSender.ts
│   │   ├── services/
│   │   │   ├── projectService.ts
│   │   │   ├── mediaImportService.ts
│   │   │   ├── mediaProbeService.ts
│   │   │   ├── thumbnailService.ts
│   │   │   ├── mediaServer.ts
│   │   │   ├── timelineService.ts
│   │   │   ├── renderService.ts
│   │   │   └── renderQueue.ts
│   │   ├── storage/paths.ts
│   │   └── security/validateAssetPath.ts
│   │
│   ├── preload/
│   │   ├── index.ts
│   │   └── appApi.d.ts
│   │
│   ├── renderer/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── styles.css
│   │   ├── pages/EditorPage.tsx
│   │   ├── components/
│   │   │   ├── AppHeader.tsx
│   │   │   ├── MediaImportPanel.tsx
│   │   │   ├── ImageGrid.tsx
│   │   │   ├── PreviewPanel.tsx
│   │   │   ├── TimelineView.tsx
│   │   │   ├── ClipInspector.tsx
│   │   │   ├── VisualSettings.tsx
│   │   │   ├── PresetPanel.tsx
│   │   │   ├── ExportDialog.tsx
│   │   │   └── RenderProgress.tsx
│   │   ├── hooks/
│   │   │   ├── useProject.ts
│   │   │   └── useRenderJob.ts
│   │   ├── store/editorStore.ts
│   │   ├── services/appClient.ts
│   │   └── utils/timecode.ts
│   │
│   ├── engine/
│   │   ├── index.ts
│   │   ├── Root.tsx
│   │   ├── compositions/AutoSlideshow.tsx
│   │   ├── components/
│   │   │   ├── ImageScene.tsx
│   │   │   ├── FittedImage.tsx
│   │   │   ├── MotionImage.tsx
│   │   │   └── VoiceTrack.tsx
│   │   ├── transitions/transitionRegistry.ts
│   │   └── motion/motionTransform.ts
│   │
│   ├── shared/
│   │   ├── schema/projectSchema.ts
│   │   ├── types.ts
│   │   ├── timeline/generateTimeline.ts
│   │   ├── timeline/validateTimeline.ts
│   │   ├── presets/presets.ts
│   │   ├── presets/seededEffects.ts
│   │   └── visual/chooseFitMode.ts
│   │
│   └── tests/
│       ├── timeline.test.ts
│       ├── fitMode.test.ts
│       ├── presets.test.ts
│       └── projectSchema.test.ts
│
├── fixtures/
│   └── generated/                # fixture nhỏ, bỏ git nếu nặng
├── scripts/
│   ├── create-fixtures.ts
│   ├── smoke-render.ts
│   └── verify-output.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── TROUBLESHOOTING.md
├── PROGRESS.md
├── README.md
├── TODO.md
├── forge.config.ts
├── vite.main.config.ts
├── vite.preload.config.ts
├── vite.renderer.config.ts
├── package.json
├── package-lock.json
└── tsconfig.json
```

**Lưu ý:** Đây là cây thư mục mục tiêu, không buộc phải đổi tên các file sẵn có trong template. Codex có thể giữ layout chuẩn của template và tạo thêm thư mục tương đương, miễn là ranh giới chức năng và scripts ổn định.

---

## 4. LƯU TRỮ CỤC BỘ VÀ QUẢN LÝ FILE

### 4.1. Nơi lưu dự án

Dùng `app.getPath('userData')/projects/{projectId}/`, **không** ghi vào `app.asar`, thư mục cài đặt hoặc `src/`.

```text
%APPDATA%/AutoProShowStudio/
├── projects/
│   └── <uuid>/
│       ├── project.json
│       ├── media/
│       │   ├── images/<uuid>.jpg
│       │   └── audio/<uuid>.mp3
│       ├── thumbnails/
│       ├── exports/
│       │   └── <name>-<timestamp>.mp4
│       └── temp/
├── render-cache/
├── logs/
└── settings.json
```

Người dùng chọn vị trí lưu video thông qua `dialog.showSaveDialog`; export có thể render vào temp trước rồi di chuyển sang đường dẫn đã chọn **sau khi thành công**.

### 4.2. Import media

- Chọn nhiều ảnh từ file dialog hoặc drag/drop.
- Hỗ trợ JPG, JPEG, PNG, WebP; loại khác báo lỗi rõ ràng.
- Chọn đúng **1 file voice** MP3 hoặc WAV trong MVP.
- Đọc **magic bytes/decoder result**, không chỉ tin extension.
- Từ chối file hỏng/không giải mã được, path traversal, file bất thường; giới hạn cấu hình (mặc định cảnh báo trên 200 ảnh hoặc ảnh cực lớn, **không tự xóa dữ liệu**).
- Copy asset vào workspace với tên UUID để tránh trùng và bảo vệ đường dẫn gốc.
- Lưu `originalFilename`, `relativePath`, `sha256`, `width`, `height`, `durationSec` nếu phù hợp.
- Normalize EXIF orientation khi tạo thumbnail; ảnh gốc giữ nguyên hoặc chuẩn hóa trong bản copy mà không làm mất chất lượng đáng kể.
- Sinh thumbnail kích thước nhỏ phục vụ UI (ví dụ chiều dài tối đa 320 px, WebP/JPEG) và cache.
- Sắp xếp mặc định bằng `Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare` trên originalFilename.
- Import đồng thời có giới hạn (ví dụ 3–4 file/lần) tránh spike RAM.

### 4.3. Trình phát media nội bộ

Xây dựng server/handler chỉ đọc phục vụ URL kiểu `http://127.0.0.1:<randomPort>/media/<sessionToken>/<assetId>`. Server:

- Chỉ cho phép asset ID tồn tại trong project active/allowlist; không nhận file path bất kỳ từ query.
- `127.0.0.1` only, cổng động, token ngẫu nhiên theo session.
- MIME đúng, header cache phù hợp; hỗ trợ Range `206 Partial Content` cho MP3/WAV để seek.
- Chặn `..`, absolute path escape, symlink thoát project root; dùng canonical path check.
- Đóng server lúc app quit; không để external clients tự chọn file.
- Khi khởi chạy EXE hoặc render headless, media URL phải truy cập được từ cả Electron renderer lẫn trình duyệt render của Remotion.

---

## 5. DỮ LIỆU PROJECT VÀ CONTRACT

### 5.1. Kiểu dữ liệu cốt lõi

Tạo `shared/types.ts` và `projectSchema.ts` (Zod) tương ứng.

```ts
export type FitMode = 'auto' | 'cover' | 'contain-blur' | 'contain';
export type MotionType =
  | 'none' | 'zoom-in' | 'zoom-out'
  | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
export type TransitionType =
  | 'none' | 'fade' | 'slide-left' | 'slide-right' | 'wipe';

export interface ImageAsset {
  id: string;
  originalFilename: string;
  relativePath: string;
  thumbnailRelativePath: string;
  width: number;
  height: number;
  sha256: string;
  order: number;
}

export interface AudioAsset {
  id: string;
  originalFilename: string;
  relativePath: string;
  durationSeconds: number;
  codec?: string;
  sampleRate?: number;
}

export interface VisualSettings {
  fitMode: FitMode;
  blurPx: number;          // default 32 ở 1080p
  backgroundScale: number; // default 1.15
  backgroundDarkness: number; // 0..1, default 0.20
  foregroundShadow: boolean;
  foregroundRadiusPx: number; // default 0
}

export interface TimelineClip {
  id: string;
  imageId: string;
  startFrame: number;       // inclusive
  durationFrames: number;   // >= 1
  endFrame: number;         // exclusive
  motion: MotionType;
  transitionIn: TransitionType;
  transitionInFrames: number;
  fitOverride?: FitMode;
}

export interface AppProject {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  seed: number;
  video: {
    width: number;
    height: number;
    fps: number;
    totalFrames: number;
  };
  presetId: 'classic' | 'news' | 'dynamic';
  visual: VisualSettings;
  voice: AudioAsset | null;
  images: ImageAsset[];
  clips: TimelineClip[];
}
```

Thêm `RenderJob` trong main process:

```ts
type RenderStatus = 'queued' | 'preparing' | 'rendering'
                  | 'finalizing' | 'completed' | 'cancelled' | 'failed';
interface RenderJob {
  id: string;
  projectId: string;
  status: RenderStatus;
  progress: number;         // 0..1
  outputPath?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}
```

### 5.2. Dữ liệu dự án mẫu

```json
{
  "schemaVersion": 1,
  "id": "uuid-project",
  "name": "My First Slideshow",
  "createdAt": "2026-10-23T00:00:00.000Z",
  "updatedAt": "2026-10-23T00:00:00.000Z",
  "seed": 20261023,
  "video": {"width": 1920, "height": 1080, "fps": 30, "totalFrames": 450},
  "presetId": "classic",
  "visual": {
    "fitMode": "auto",
    "blurPx": 32,
    "backgroundScale": 1.15,
    "backgroundDarkness": 0.2,
    "foregroundShadow": true,
    "foregroundRadiusPx": 0
  },
  "voice": null,
  "images": [],
  "clips": []
}
```

**Không** lưu absolute path / URL chứa session token vĩnh viễn trong JSON. Những URL phục vụ Player được tạo từ asset ID **khi mở dự án**. Có migration/schema-version check khi đọc project; save atomic (`write temp -> rename`).

---

## 6. TIMELINE ENGINE — QUY TẮC BẮT BUỘC

### 6.1. Định nghĩa chính xác

- `fps`: mặc định 30.
- `D = ceil(audioDurationSeconds * fps)` là số frame video đích.
- `N`: số ảnh, tối thiểu 1.
- `T`: số frame chồng lấn giữa 2 clip liên tiếp (trong MVP dùng cùng T cho mọi boundary).
- `L_i`: độ dài clip thứ i tính bằng frame nguyên.

**Bất biến bắt buộc:**

```text
D = SUM(L_i) - (N - 1) * T
clips[0].startFrame === 0
clips[i].endFrame - clips[i+1].startFrame === T
clips[N-1].endFrame === D
mọi start/end/duration/transition đều là số nguyên
mọi L_i >= 1
không có gap, không có transition ba clip chồng lên nhau
```

Với motion/transition kiểu Remotion `TransitionSeries`, nên bảo đảm **mỗi clip giữa có thời gian nội dung đủ để hai transition đầu/cuối không đè lên nhau**; chọn conservative rule:

```text
L_i >= 2*T + 1  (với mọi i, nếu T > 0)
```

Điều này chặt hơn mức tối thiểu, nhưng ổn định cho MVP.

**Ca đặc biệt:**

- `N = 1`: một ảnh kéo dài suốt voice, `T=0`.
- `N > D`: về vật lý không thể hiển thị mỗi ảnh ít nhất 1 frame; **thông báo lỗi có hướng xử lý** (giảm số ảnh / tăng độ dài voice / tăng FPS), không tạo clip 0 frame hay tự bỏ ảnh bí mật.
- Voice rất ngắn / nhiều ảnh: tự giảm T dần đến 0 để thỏa bất biến, hiển thị cảnh báo UI `transition shortened`.
- Voice duration đo bằng FFprobe có thể sai khác rất nhỏ do encoder padding; output có sai số tối đa 1 frame so với đích tính toán, không cho phép timeline tự trôi.

### 6.2. Thuật toán tham khảo triển khai thực tế

```ts
interface TimelineInput {
  imageIds: string[];
  audioDurationSeconds: number;
  fps: number;
  requestedTransitionSeconds: number;
}

export function allocateClips(input: TimelineInput) {
  const {imageIds, audioDurationSeconds, fps} = input;
  const n = imageIds.length;
  if (n < 1 || !Number.isFinite(audioDurationSeconds) ||
      audioDurationSeconds <= 0 || fps <= 0) {
    throw new Error('Invalid timeline input');
  }
  const D = Math.ceil(audioDurationSeconds * fps);
  if (n > D) {
    throw new Error('Too many images for available video frames');
  }

  let T = n === 1 ? 0 : Math.max(
    0,
    Math.round(input.requestedTransitionSeconds * fps)
  );

  const allocated = (t: number) => D + (n - 1) * t;
  const smallestClip = (t: number) => Math.floor(allocated(t) / n);
  // Bảo đảm không có transition đè nhau ở clip giữa.
  while (T > 0 && smallestClip(T) < 2 * T + 1) T--;

  const totalAllocated = allocated(T);
  const base = Math.floor(totalAllocated / n);
  const remainder = totalAllocated % n;
  let cursor = 0;

  const clips = imageIds.map((imageId, i) => {
    const durationFrames = base + (i < remainder ? 1 : 0);
    const startFrame = cursor;
    const endFrame = startFrame + durationFrames;
    const clip = {
      id: `clip-${imageId}`,
      imageId,
      startFrame,
      durationFrames,
      endFrame,
      transitionInFrames: i === 0 ? 0 : T,
    };
    cursor = endFrame - (i === n - 1 ? 0 : T);
    return clip;
  });

  if (clips.at(-1)!.endFrame !== D) {
    throw new Error('Timeline invariant violated');
  }
  return {totalFrames: D, transitionFrames: T, clips};
}
```

**Codex phải viết unit tests cho thuật toán này** và bổ sung logic `motion`, `transitionIn` từ preset. Khi người dùng kéo thả ảnh, ảnh vẫn có ID ổn định, thứ tự và frame được tính lại. Khi người dùng chọn preset khác, tính lại hiệu ứng (deterministic) nhưng **không mất ảnh**.

### 6.3. Ví dụ để đối chiếu

Voice 600 giây, 100 ảnh, 30 FPS, crossfade 1 giây:

```text
D = 600 * 30 = 18000 frames
N = 100
T = 1 * 30 = 30 frames
SUM(L_i) = 18000 + 99 * 30 = 20970 frames
L_i ≈ 209.7 frames (6.99 giây/ảnh)
Tổng xuất cuối = 18000 frames = 600 giây
```

### 6.4. Không suy diễn timeline từ CSS

- Store bản `clips[]` trong JSON.
- Render với `durationInFrames = project.video.totalFrames`.
- Preview `@remotion/player` nhận cùng `AutoSlideshow` component và same props.
- Transition không được tự kéo dài/cắt timeline ngoài hợp đồng dữ liệu.
- `endFrame` exclusive; seek frame i cần render đúng ảnh và vùng transition.

---

## 7. MOTION ENGINE — HIỆU ỨNG PROSHOW

Mỗi clip có một motion gắn sẵn; motion nội bộ chạy theo **local frame**, còn timeline dùng **global frame**. Các tham số tính bằng `interpolate()` có clamp.

### 7.1. Các motion bắt buộc

| Motion | Hành vi | Default gợi ý |
|---|---|---|
| `none` | không chuyển động | — |
| `zoom-in` | zoom từ 1.02 lên 1.10 | slow easing |
| `zoom-out` | zoom từ 1.10 về 1.02 | slow easing |
| `pan-left` | dịch nhẹ phải → trái | 2–4% |
| `pan-right` | trái → phải | 2–4% |
| `pan-up` | dưới → trên | 2–4% |
| `pan-down` | trên → dưới | 2–4% |

- Không để ảnh méo (`object-fit` giữ tỉ lệ).
- Không nhảy đột ngột ở đầu/cuối clip; dùng easing nhẹ.
- Không tạo các giá trị biến đổi phụ thuộc thời gian thực (`Date.now()`, `Math.random()`).
- `motionTransform.ts` là hàm thuần: `(motion, localFrame, duration, strength, safeBounds) -> CSS transform`.
- Hiệu ứng background blur chạy độc lập với foreground; background chuyển động **nhẹ hơn**.

### 7.2. Quy tắc tránh lộ viền / crop chủ thể

Với `cover`: đủ diện tích để phủ khung, khi pan phải có lượng overscan an toàn; có thể dùng scale tối thiểu > 1 và giới hạn translate theo kích thước render.

Với `contain-blur`: yêu cầu **giữ nội dung ảnh chính không bị cắt**. Do đó **không** áp `scale(1.10)` lên một ảnh đã chạm sát chiều rộng/chiều cao khung. Thay thế:

- Foreground zoom *nằm trong vùng chứa*: `0.96 → 1.0` hoặc `1.0 → 0.96`, không vượt quá 1.0 nếu có nguy cơ cắt.
- Pan chỉ theo trục có vùng trống sau khi contain, tính biên an toàn.
- Background dùng cover + blur + overscan, có thể zoom 1.10 → 1.14.
- Motion mạnh hơn chỉ cho phép khi user tự chọn mode `cover` / `allowCrop` (để sau MVP).

**Điều kiện nghiệm thu:** nếu chọn một ảnh dọc 9:16 trong khung ngang 16:9, nội dung ảnh dọc vẫn nằm trọn trong foreground suốt video, background full bleed không đen mép.

---

## 8. SMART FIT + BLURRED BACKGROUND — YÊU CẦU TỪ ẢNH MẪU

### 8.1. Yêu cầu hiển thị

Khi ảnh không vừa khung, tool phải tạo **2 lớp cùng một ảnh**:

```text
┌───────────────────────────── FRAME ──────────────────────────────┐
│ BACKGROUND: image cover + scale 1.15 + blur 32px + dim 20%      │
│                                                                 │
│                   ┌───────────────────┐                         │
│                   │  FOREGROUND IMAGE │                         │
│                   │  sharp, contain   │                         │
│                   │  keep full photo  │                         │
│                   └───────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Đây là kiểu nền làm mờ từ cùng hình gốc giống ví dụ người dùng đã gửi. **Không được** dùng khung đen mặc định với ảnh dọc/lệch tỉ lệ.

### 8.2. Chọn mode tự động

Dùng chênh lệch **tỉ lệ tương đối**, không dùng chênh lệch số học thô:

```ts
export function chooseFitMode(
  imageWidth: number, imageHeight: number,
  videoWidth: number, videoHeight: number
): 'cover' | 'contain-blur' {
  if ([imageWidth, imageHeight, videoWidth, videoHeight]
      .some(v => !Number.isFinite(v) || v <= 0)) {
    throw new Error('Invalid dimensions');
  }
  const imageRatio = imageWidth / imageHeight;
  const frameRatio = videoWidth / videoHeight;
  const ratioGap = Math.abs(Math.log(imageRatio / frameRatio));
  // Cho crop nhẹ khoảng <= 15% chênh lệch tỉ lệ.
  return ratioGap <= Math.log(1.15) ? 'cover' : 'contain-blur';
}
```

Người dùng có thể override mỗi clip với `fitOverride`, và override toàn project bằng `visual.fitMode`.

**Ví dụ:** 1920×1080 vào 1920×1080 → `cover`; 1080×1920 vào 1920×1080 → `contain-blur`; 1080×1080 vào 1920×1080 → `contain-blur`. Điều này phải được test.

### 8.3. Component `FittedImage.tsx`

Props dự kiến:

```ts
interface FittedImageProps {
  src: string;
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  mode: FitMode;
  visual: VisualSettings;
  motion: MotionType;
  localFrame: number;
  durationFrames: number;
}
```

**Thứ tự layer:**

1. `<AbsoluteFill overflow="hidden">` outer container.
2. Background `<Img>` full frame với `objectFit:'cover'`, `filter:blur(...)`, `transform:scale(...)`.
3. Overlay màu đen với opacity `backgroundDarkness`.
4. Foreground `<Img>` center, `objectFit:'contain'`, `maxWidth:'100%'`, `maxHeight:'100%'`, tùy chọn shadow/radius, motion bounded.

Trong video ngang có ảnh dọc, side bars xuất hiện từ **chính background bị làm mờ**, không kéo giãn ảnh chính. Trong video dọc có ảnh ngang, vùng trên/dưới cũng xử lý tương tự.

### 8.4. Thiết lập trong UI

- `Fit mode`: `Auto` / `Full frame (cover)` / `Blur background` / `Contain`.
- `Blur strength`: 0–60 px, mặc định **32 px tại 1080p**. Khi render 720p có thể scale hiệu ứng theo tỉ lệ chiều cao.
- `Background darkness`: 0–40%, mặc định **20%**.
- `Background zoom`: 1.05–1.25, mặc định **1.15**.
- `Foreground shadow`: on/off, mặc định on.
- `Border radius`: 0–24 px, mặc định 0.
- `Apply to all` / override clip đang chọn.

### 8.5. Lưu ý hiệu năng

- CSS `filter:blur` trên 200 ảnh ở cùng thời điểm sẽ gây nặng. Mỗi frame chỉ mount scene đang cần; `TransitionSeries` chỉ render scene gần thời điểm đang phát.
- Có thể tạo **blurred background cache** bằng Sharp sau MVP nếu benchmark cho thấy GPU/CPU filter nặng.
- Không dùng thumbnail làm ảnh foreground khi xuất 1080p.

---

## 9. TRANSITION ENGINE

Dùng package chính thức `@remotion/transitions` và `TransitionSeries` nếu phiên bản đang dùng tương thích. Bắt đầu với `fade()`; sau đó thêm `slide()` và `wipe()`. Dùng `linearTiming({durationInFrames: T})` hoặc timing chính thức phù hợp.

**Quan trọng:** `<TransitionSeries.Transition>` **rút ngắn tổng thời lượng** bởi overlap. Không cộng transition vào video lần thứ hai. Dữ liệu từ `allocateClips()` là nguồn chân lý duy nhất.

Pseudo-structure:

```tsx
// Truyền trực tiếp các Sequence / Transition làm children.
// Không bọc chúng trong <div>; tránh Fragment nếu thư viện yêu cầu
// nhận diện kiểu child trực tiếp. Kiểm tra API theo version cài đặt.
const parts: React.ReactNode[] = [];
for (const [index, clip] of clips.entries()) {
  if (index > 0 && clip.transitionInFrames > 0) {
    parts.push(
      <TransitionSeries.Transition
        key={`t-${clip.id}`}
        presentation={getPresentation(clip.transitionIn)}
        timing={linearTiming({durationInFrames: clip.transitionInFrames})}
      />
    );
  }
  parts.push(
    <TransitionSeries.Sequence
      key={`s-${clip.id}`}
      durationInFrames={clip.durationFrames}
    >
      <ImageScene clip={clip} />
    </TransitionSeries.Sequence>
  );
}
return <TransitionSeries>{parts}</TransitionSeries>;
```

Phần trên là **hướng dẫn cấu trúc**, Codex cần đối chiếu API của phiên bản cài và sửa TSX thật, đảm bảo kết quả trùng `totalFrames`. Với transition `none` nhưng vẫn có overlap, phải xác định cut semantics rõ ràng; trong MVP, `none` được định nghĩa là **T=0 cho toàn timeline** hoặc chỉ dùng các transition có overlap. Không được tạo gap/timing mâu thuẫn.

### Preset mẫu

```ts
export const presets = {
  classic: {
    name: 'Classic ProShow',
    transitionSeconds: 0.9,
    zoomStrength: 0.08,
    panStrength: 0.025,
    motions: ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'],
    transitions: ['fade', 'fade', 'fade', 'wipe'],
  },
  news: {
    name: 'News Documentary',
    transitionSeconds: 0.6,
    zoomStrength: 0.07,
    panStrength: 0.035,
    motions: ['zoom-in', 'pan-right', 'zoom-out', 'pan-left'],
    transitions: ['fade', 'fade', 'slide-left'],
  },
  dynamic: {
    name: 'Dynamic Slideshow',
    transitionSeconds: 0.45,
    zoomStrength: 0.12,
    panStrength: 0.04,
    motions: ['zoom-in', 'pan-left', 'zoom-out', 'pan-right'],
    transitions: ['slide-left', 'wipe', 'fade'],
  },
} as const;
```

- Dùng seeded PRNG để chọn motion/transition theo preset; không lặp cùng motion >=3 clip liên tiếp.
- Các hiệu ứng phụ thuộc `project.seed` và được **ghi vào `clips[]`**.
- Chỉ tái tạo hiệu ứng khi user chọn `Regenerate effects` hoặc đổi preset.
- Preview và export dùng cùng values, không chọn lại hiệu ứng trong component.

---

## 10. PREVIEW + TIMELINE UI

### 10.1. Giao diện

Editor gồm:

```text
┌────────────────────────────────────────────────────────────────┐
│ Auto ProShow Studio | Project name       [Save] [Export MP4]   │
├─────────────────────┬──────────────────────────────────────────┤
│ Media Library       │ Preview 16:9 / 9:16                     │
│ [Add images]        │ [Remotion Player]                       │
│ [Add voice]         │ Play/Pause, scrub, timecode             │
│ thumbnail grid      │                                          │
├─────────────────────┴──────────────────────────────────────────┤
│ Preset | Canvas | Auto Fit | Blur | Zoom/Pan | Transition      │
├────────────────────────────────────────────────────────────────┤
│ Timeline: [Img1][Img2][Img3] ...                              │
│ Voice:    [=============== waveform/progress ============]     │
└────────────────────────────────────────────────────────────────┘
```

### 10.2. Hành vi UI

- Chọn ảnh/voice, hiển thị thumbnail, thời lượng voice.
- Nút `Generate Video` hoặc auto generate khi đủ data; loading state.
- Kéo thả reorder ảnh (dùng thư viện DnD phù hợp nếu cần).
- Click clip mở panel điều chỉnh motion/fit override.
- `Preset` cho thay toàn bộ hiệu ứng.
- `Preview` qua `<Player component={AutoSlideshow} ... />`, `fps`, `durationInFrames`, `compositionWidth/Height`, `inputProps` từ project.
- Scrub thay đổi current frame, Play/Pause, mute/volume.
- Save project atomically, debounce autosave (nếu triển khai).
- Có các trạng thái `empty`, `importing`, `ready`, `rendering`, `error`.
- Khi render đang chạy, người dùng vẫn xem UI; cấm trùng render của cùng project nếu policy chọn concurrency=1.
- Hiện lỗi cụ thể: "Voice không đọc được", "Ảnh bị hỏng", "Không đủ frame cho số ảnh", "Không đủ dung lượng ổ đĩa".

### 10.3. Yêu cầu UI

- Giao diện tối, dễ nhìn, responsive trong cửa sổ min 1100×700; dark theme mặc định.
- Ảnh thumbnail lazy load, không render tất cả ảnh full size trong DOM.
- Preview ưu tiên độ phân giải thấp hơn composition để đỡ tốn tài nguyên nhưng sử dụng cùng scene logic.
- Timeline hiển thị frame/time chính xác, transition có vùng overlap trực quan.
- Phím tắt gợi ý: Space play/pause, Ctrl+S save, Ctrl+E export, Delete remove selected image (kèm xác nhận khi cần).

---

## 11. ELECTRON API / IPC CONTRACT

### 11.1. Cầu nối kiểu dữ liệu

Renderer **chỉ** được gọi API allowlisted qua `window.appAPI`, không expose trực tiếp `ipcRenderer`, Node, filesystem, hoặc arbitrary shell command.

```ts
export interface AppAPI {
  createProject(name: string): Promise<AppProject>;
  openProject(): Promise<AppProject | null>;
  saveProject(project: AppProject): Promise<void>;
  importImages(projectId: string): Promise<ImageAsset[]>;
  importAudio(projectId: string): Promise<AudioAsset | null>;
  getMediaUrls(projectId: string): Promise<Record<string, string>>;
  generateTimeline(projectId: string): Promise<AppProject>;
  reorderImages(projectId: string, imageIds: string[]): Promise<AppProject>;
  updateProject(project: AppProject): Promise<AppProject>;
  chooseExportPath(defaultName: string): Promise<string | null>;
  startRender(projectId: string, outputPath: string): Promise<RenderJob>;
  cancelRender(jobId: string): Promise<void>;
  getRenderJob(jobId: string): Promise<RenderJob | null>;
  onRenderProgress(callback: (job: RenderJob) => void): () => void;
}
```

**IPC:** `ipcMain.handle(...)` cho request/response; render progress push qua event với wrapper chỉ nhận payload, `onRenderProgress` trả về unsubscribe. Main kiểm tra sender/window, parse args bằng Zod, không nhận arbitrary path file từ frontend ngoại trừ output path **đã được cấp bởi Save Dialog**.

### 11.2. Security bắt buộc

```ts
webPreferences: {
  preload: /* resolved bundled preload file */,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
}
```

- Không bật `webSecurity: false`.
- Không load remote website trong editor.
- CSP phù hợp với Vite development và bản packaged.
- Giới hạn external navigation/window creation.
- Validate mọi IPC sender và tham số.
- Chạy logic xử lý nặng ở worker/child process khi cần để main thread không treo.

**Không dùng `file://` tùy tiện để mở mọi asset qua Electron.** Chỉ cung cấp asset qua media bridge/loopback có allowlist.

---

## 12. RENDER ENGINE / EXPORT

### 12.1. Quy trình render

1. `startRender`: verify project bằng Zod + kiểm tra mọi media còn tồn tại.
2. Chọn output MP4 bằng dialog, kiểm tra quyền ghi và dung lượng đĩa.
3. Tạo `RenderJob` trạng thái `queued`; queue concurrency=1.
4. Main/worker nạp **prebuilt Remotion bundle** (production) hoặc bundle cache (development).
5. Map project + session media URLs thành `inputProps` cho `AutoSlideshow`.
6. `selectComposition()` và `renderMedia()` ở Node.
7. Bắn progress lên renderer với throttle (ví dụ <= 10 sự kiện/s).
8. Dùng `makeCancelSignal()` và hỗ trợ `Cancel`.
9. Render vào file tạm, sau thành công `rename/move` sang file cuối; thất bại/hủy xóa temp và giữ project.
10. Kiểm tra đầu ra bằng ffprobe (duration/fps/resolution/codecs); chỉ báo complete khi file hợp lệ.

### 12.2. Cài đặt render MVP

```text
Format: MP4
Video: H.264
Audio: AAC
FPS: 30
Aspect: 16:9 / 9:16
Output: 1280x720 / 1920x1080 / 1080x1920
Default: 1920x1080 30 FPS
Concurrency: 1 render job
Hardware acceleration: optional AFTER CPU encoder works
```

Đừng hardcode `ffmpeg.exe` hệ thống trong packaged app. Phần mềm phải dùng binary tương thích đóng gói/được quản lý bởi Remotion và có quy trình phân phối hợp lệ. **Đóng gói sẵn headless browser/compositor cần thiết** hoặc chứng minh offline startup/export trên máy sạch. Không được yêu cầu người dùng cuối cài Node.js/FFmpeg/Chrome riêng khi dùng EXE.

### 12.3. Cancellation & error handling

- Cancel trạng thái render hiện tại: gọi cancel signal, mark `cancelled`, thu hồi temp.
- Lỗi file ảnh, audio decoder, Chromium, ffmpeg, thiếu bộ nhớ: status `failed`, message ngắn gọn + log chi tiết.
- Có một render job tại một thời điểm; nếu queue nhiều thì hiển thị `queued`.
- Nếu đóng app khi render, xác nhận hành động; đảm bảo dừng child process đúng cách.
- Không để file MP4 dang dở với tên final.

### 12.4. Nhất quán preview/export

Đây là **điều kiện quan trọng nhất về chất lượng**:

- `AutoSlideshow` render cho Player và renderer Node là **cùng component**.
- Scene input là **cùng project snapshot**.
- Motion + transitions + fitmode định nghĩa cùng chỗ, không có bản CSS preview riêng và bản FFmpeg filter riêng.
- Số frame cuối đúng `totalFrames`.
- Voice xuất cùng file audio, không shift offset qua các transition.

---

## 13. BUILD WINDOWS EXE VÀ OFFLINE

### 13.1. Phương án

Dựa vào template **Remotion + Electron Forge** chính thức để giảm rủi ro với `@remotion/renderer` và binary native. Tiếp tục dùng **React** làm giao diện, chỉ thêm Electron main/preload để đóng gói EXE. Không viết lại React khi chuyển từ môi trường phát triển sang EXE.

### 13.2. Các script cần có

Tạo/giữ scripts đúng với template đang cài. Mục tiêu:

```json
{
  "scripts": {
    "dev": "electron-forge start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint .",
    "package:win": "electron-forge package --platform=win32 --arch=x64",
    "make:win": "electron-forge make --platform=win32 --arch=x64",
    "smoke:render": "tsx scripts/smoke-render.ts"
  }
}
```

Đây là script **mục tiêu**, Codex cần chỉnh tùy cấu hình template thực tế và verify từng script. `package` tạo thư mục ứng dụng; `make` tạo artifact phát hành (installer/zip tùy maker) nếu cấu hình maker phù hợp.

### 13.3. Tài nguyên lúc đóng gói

- Pre-build Remotion composition bundle **một lần lúc build**, không bundle lại trên máy khách.
- Stage native compositor binary / bộ phụ thuộc đúng kiến trúc Windows x64.
- Đảm bảo asset tĩnh, fonts hệ thống và preload nằm đúng path.
- Không đọc file trong `app.asar` như đường dẫn filesystem có thể ghi.
- `app.getPath('userData')` cho media dự án; `app.getPath('temp')` hoặc project temp cho working files.
- Browser rendering nếu cần Chrome Headless Shell, bundle hoặc triển khai bảo đảm offline; làm test tắt Wi-Fi trên máy sạch.
- Ghi log vị trí binary/asset (không leak đường dẫn nhạy cảm ra UI ngoài nhu cầu hỗ trợ).
- Xác nhận giấy phép Remotion, FFmpeg và các codec/binaries trước khi phân phối công khai/thương mại.

### 13.4. Các ca kiểm thử packaging

- EXE launch không cần `npm` hoặc `node` ngoài máy.
- Import và preview không lỗi `file not found` / CSP.
- Render 10 giây khi **không có Internet**.
- Đóng và mở lại app, project vẫn tồn tại.
- `Cancel` không để tiến trình nền lơ lửng.
- Không tốn CPU/GPU sau khi đóng app.

---

## 14. BẢO MẬT, LOG, HIỆU NĂNG

### 14.1. Bảo mật dữ liệu

- Mặc định không upload media lên Internet.
- Không telemetry/analytics trong MVP.
- Nhập tên dự án cần sanitize (file system safe).
- Không chạy code/script từ file media, không cho phép đọc arbitrary path.
- Error log tránh chứa đường dẫn nhạy cảm ngoài cần thiết.
- API IPC và media server phải validate dựa trên **project ownership/allowlist**.

### 14.2. Tối ưu

- Thumbnail lazy load, paginate/virtualize nếu >100 ảnh.
- Audio waveform (nếu làm) tính ở background, không block UI.
- Render concurrency=1, cho phép cấu hình lượng RAM/tabs render nếu API hỗ trợ.
- Pre-bundle/cache Remotion engine, chỉ rebuild khi code composition thay đổi.
- Không encode/chuyển format media vô ích; ưu tiên đọc metadata + sử dụng ảnh gốc.
- Blur bằng CSS trước, benchmark rồi mới pre-render blurred background nếu cần.
- Không hứa sử dụng GPU/NVENC trong MVP; đầu tiên ổn định CPU H.264.

### 14.3. Logging

`logs/app.log`, `logs/render-<jobId>.log` với timestamp và error stack. UI error message ngắn gọn + nút `Open logs folder` qua IPC allowlist nếu cần.

---

## 15. KẾ HOẠCH TRIỂN KHAI CHO CODEX

### PHASE 1 — Scaffold + Electron shell + layout

**Công việc:**

1. Kiểm tra thư mục hiện tại, Node/npm, Windows target, package manager.
2. Nếu repo rỗng, tạo từ template Remotion Electron chính thức; install dependencies, run dev.
3. Cấu hình TypeScript, lint, format, test runner.
4. Xây dựng layout editor dark theme, các khu vực import/preview/timeline/settings.
5. Tạo `src/shared/types.ts`, Zod schema, `AppAPI` preload với hàm healthcheck mẫu.

**Tiêu chí xong:** Electron mở với React UI và không có lỗi console nghiêm trọng; `npm run typecheck` pass.

### PHASE 2 — Project storage + media import

**Công việc:**

1. `ProjectService`: create, list/open, save atomically, validate `schemaVersion`.
2. `MediaImportService`: select/copy nhiều ảnh, 1 voice; UUID; metadata/thumbnail; natural sort.
3. `MediaProbeService`: ffprobe duration audio, image dimensions/orientation.
4. Local media server + media URL resolver cho Player và headless renderer.
5. UI hiện danh sách ảnh và voice duration; xử lý lỗi file.

**Tiêu chí xong:** import 20 ảnh nhiều ratio, 1 MP3/WAV, đóng mở dự án vẫn đủ file; URL image và audio mở được trong Electron.

### PHASE 3 — Timeline + fit/blur + simple preview

**Công việc:**

1. Viết `allocateClips()` và unit tests invariants.
2. Viết `chooseFitMode()` và tests.
3. Tạo `FittedImage`: `cover`, `contain`, `contain-blur`.
4. `AutoSlideshow`: render ảnh tuần tự với no transition trước, thêm voice track.
5. Gắn Player, Seek, Play/Pause, timecode; sau đó thêm crossfade `TransitionSeries`.
6. Test một voice 12 giây / 3 ảnh, 1 dọc + 1 ngang + 1 vuông.

**Tiêu chí xong:** preview đúng thời lượng, voice phát được, ảnh dọc có background blur đúng mẫu, không có khung đen.

### PHASE 4 — Motion + presets + timeline editor

**Công việc:**

1. Hoàn thiện 6 motions, chống crop ảnh foreground chế độ blur.
2. Thêm transition slide/wipe nếu tương thích.
3. Seeded effect selection, 3 presets, không lặp gắt.
4. Kéo thả reorder ảnh, chọn clip, thay motion/fit override.
5. Thêm global image fit settings/blur sliders, save project.
6. Verify cùng seed tạo cùng timeline và cùng hiệu ứng.

**Tiêu chí xong:** preview chỉnh sửa thật, reorder và đổi preset không mất file; lưu/mở lại đúng.

### PHASE 5 — Render MP4 + progress + cancel

**Công việc:**

1. Render service trong main/worker, prebundle/cache Remotion.
2. Tạo job queue concurrency=1, progress events.
3. Save dialog và export file tạm → final.
4. Hỗ trợ cancel signal + cleanup.
5. ffprobe xác minh đầu ra.
6. End-to-end test fixture ngắn (3–5 ảnh, 8–15s audio).

**Tiêu chí xong:** video MP4 mở được bằng VLC/Windows player, voice có tiếng, thời lượng sát file audio trong giới hạn frame, không đen/lệch ratio.

### PHASE 6 — Package/installer Windows + regression

**Công việc:**

1. Chuẩn hóa cấu hình Electron Forge, đóng gói Remotion bundle/binary cần thiết.
2. Test packaged app, import/render offline, lưu project đúng `userData`.
3. Stress test 100–200 ảnh và 10–20 phút voice **sau khi** test nhỏ pass; đo CPU/RAM/thời gian, cải tiến nếu crash.
4. README: cài, chạy dev, build, troubleshooting, folder output.
5. `PROGRESS.md`, `TODO.md`, `docs/DECISIONS.md`; báo kết quả thật và hạn chế.

**Tiêu chí xong:** một ứng dụng Windows có thể chạy độc lập, render video mà không cần cài Node/FFmpeg riêng; README có lệnh thực tế đã xác minh.

---

## 16. UNIT / INTEGRATION / E2E TEST MATRIX

Viết tests tự động nhất có thể. Với end-to-end máy bàn, nếu thiếu môi trường GUI/Windows, tạo smoke test cho engine và ghi rõ chưa chạy GUI/Electron packaged.

| ID | Đầu vào | Kết quả kỳ vọng |
|---|---|---|
| T01 | 1 ảnh, audio 10s | 1 clip, không transition, tổng 300 frames |
| T02 | 2 ảnh, audio 10s, fade 1s | sum clip - overlap = 300 frames |
| T03 | 100 ảnh, audio 600s | tổng chính xác 18.000 frames |
| T04 | 60 ảnh, audio 1s, 30fps | báo lỗi N>D, không tạo clip 0-frame |
| T05 | 10 ảnh, audio rất ngắn | tự giảm transition nếu cần, không triple overlap |
| T06 | ảnh 9:16 trong frame 16:9 | chọn `contain-blur` |
| T07 | ảnh 16:9 trong frame 16:9 | chọn `cover` |
| T08 | ảnh 1:1 trong frame 16:9 | chọn `contain-blur` |
| T09 | ảnh bị hỏng / extension giả | import từ chối, app không crash |
| T10 | ảnh EXIF xoay 90° | thumbnail/fit đúng chiều |
| T11 | thứ tự `1.jpg`, `2.jpg`, `10.jpg` | natural sort đúng |
| T12 | seed project không đổi | thứ tự hiệu ứng ổn định |
| T13 | reorder ảnh và save/open | không mất file, thứ tự được giữ |
| T14 | cancel khi progress 20% | job cancelled, xóa file tạm |
| T15 | export 15s 1080p MP4 | H.264/AAC, no blank frames, audio đồng bộ |
| T16 | build Windows + offline | EXE start và export thành công |
| T17 | Unicode filename tiếng Việt/Ba Lan | import, preview, save, render không lỗi |
| T18 | đường dẫn ký tự `..`/invalid asset ID | từ chối an toàn |
| T19 | ảnh dọc contain-blur có motion | foreground không bị crop nội dung |
| T20 | render lỗi / thiếu disk | trạng thái failed, không có final MP4 hỏng |

### 16.1. Test frame-level

Ngoài test số frame, chụp một số frame ở đầu/giữa/cuối fade bằng Remotion still/renderFrames để so sánh snapshot hoặc manual validation:

- Frame `0` phải có ảnh 1.
- Frame `clip[1].startFrame` phải bắt đầu transition đúng vị trí.
- Frame `totalFrames-1` phải có ảnh cuối.
- Trong mỗi transition, không được có khung hình đen trống.

### 16.2. Fixture tự sinh

Tạo `scripts/create-fixtures.ts`: tạo 3–5 ảnh JPEG/PNG khác ratio (có thể dùng Sharp vẽ nền và chữ số), 1 WAV 8–15 giây tiếng test/tone bằng công cụ cục bộ. Fixture không chứa nội dung copyrighted. Dùng trong CI/smoke test, đảm bảo repro.

---

## 17. TIÊU CHÍ CHẤP NHẬN SẢN PHẨM (DEFINITION OF DONE)

**Không được đánh dấu hoàn thành nếu chưa đáp ứng những tiêu chí sau:**

- [ ] `npm install` / `npm ci` thành công trên môi trường hỗ trợ.
- [ ] `npm run dev` mở cửa sổ editor và preview.
- [ ] Import JPG/PNG/WebP + MP3/WAV; natural sort, thumbnail hiển thị.
- [ ] Timeline tổng frame khớp voice, không có clip 0 frame.
- [ ] Chuyển cảnh đúng với độ chồng lấn frame, không đen giữa clip.
- [ ] Motion Zoom/Pan hoạt động, không tự thay đổi mỗi lần preview.
- [ ] `Auto Fit` chuyển ảnh dọc vào khung ngang sang nền mờ đúng như yêu cầu.
- [ ] Ảnh chính không bị kéo giãn hoặc crop trong `contain-blur`.
- [ ] Voice phát trong preview và file MP4 cuối.
- [ ] Export MP4 720p và 1080p, H.264/AAC, kiểm tra ffprobe.
- [ ] Render progress hoạt động, cancel được, cleanup file tạm.
- [ ] Save/load project, reorder ảnh, đổi preset.
- [ ] Unit tests timeline và fit mode pass.
- [ ] `npm run package:win` (hoặc script thực tế) tạo được app Windows.
- [ ] Test packaged export **offline** trên Windows sạch hoặc ghi rõ tại sao chưa chạy.
- [ ] README và PROGRESS.md cập nhật, không có claim sai.

---

## 18. QUY TẮC PHẢN HỒI CUỐI CỦA CODEX

Khi triển khai xong, trả lời theo đúng bố cục:

```text
1. Đã triển khai:
   - ...
2. Các file/module chính:
   - ...
3. Cách chạy:
   - npm ci
   - npm run dev
   - npm run package:win
4. Các lệnh thực sự đã chạy và kết quả:
   - npm run typecheck: PASS/FAIL
   - npm test: PASS/FAIL
   - smoke render: PASS/FAIL
   - packaged Windows test: PASS/FAIL/NOT RUN
5. File EXE/output nằm ở đâu:
   - đường dẫn thực tế (nếu tạo được)
6. Hạn chế/việc còn lại:
   - ...
```

Không mô tả như thể đã có EXE khi chỉ mới dựng source code. Không báo **PASS** khi chưa chạy test. Nếu không có máy Windows trong môi trường của Codex, phải ghi **NOT RUN** cho packaged Windows test và đưa lệnh kiểm thử cho người dùng.

---

## 19. ROADMAP SAU MVP (KHÔNG TRIỂN KHAI TRƯỚC KHI MVP PASS)

1. **Batch Renderer**: mỗi folder chứa một voice + thư mục images, tool tạo MP4 hàng loạt.
2. **Nhạc nền**: track riêng với volume và audio ducking theo voice.
3. **Phụ đề**: người dùng import SRT, hiển thị text an toàn trong bố cục.
4. **Preset nâng cao**: nhiều kiểu ProShow, light leak, mask transitions (ưu tiên ổn định hơn số lượng).
5. **Watermark/Logo tùy chọn**: overlay tự cấu hình.
6. **Quick render profiles**: YouTube Longform 16:9, Shorts 9:16, 720p Draft.
7. **Smart photo duration**: thay chia đều bằng trọng số do người dùng chỉnh (không AI), vẫn bảo toàn tổng frame.
8. **Optional AI**: ghép ảnh theo transcript voice (làm riêng ở v2, không làm trong MVP này).

---

## 20. CÂU LỆNH DÙNG VỚI CODEX

Sau khi đưa file MD này vào thư mục repository (tên gợi ý `SPEC.md`), gửi Codex yêu cầu:

> Đọc toàn bộ `SPEC.md` và coi đó là đặc tả sản phẩm. Hãy xây dựng Auto ProShow Studio theo đúng mục 0–18. Bắt đầu bằng kiểm tra repository, khởi tạo từ template Remotion Electron chính thức nếu repo đang trống, rồi triển khai lần lượt phase 1–6. Mục tiêu trước tiên là luồng chạy thật: nhập voice và nhiều ảnh → chia timeline frame-perfect → tự tạo Zoom/Pan + transition → ảnh lệch khung dùng blurred background → preview → xuất MP4. Chạy typecheck, unit tests, smoke render; sửa lỗi trước khi chuyển phase. Không chỉ lập kế hoạch hay mock UI. Cập nhật `PROGRESS.md` sau từng phase và báo rõ các test chưa chạy. Giữ toàn bộ chức năng offline khi đóng gói EXE.

Nếu Codex giới hạn độ dài một lần làm việc, cho chạy từng phase với chỉ dẫn: **“Tiếp tục phase kế tiếp theo SPEC.md, không viết lại phần đã hoàn thành; chạy test và cập nhật PROGRESS.md.”**

---

## 21. TÀI LIỆU THAM KHẢO CHÍNH THỨC

Các URL dùng để Codex đối chiếu API mới nhất trước khi code (API có thể thay đổi):

- Remotion + Electron official template: https://www.remotion.dev/templates/electron
- Template source / packaging: https://github.com/remotion-dev/template-electron
- Remotion transitions / overlap: https://www.remotion.dev/docs/transitioning
- Remotion `TransitionSeries`: https://www.remotion.dev/docs/transitions/transitionseries
- Remotion `<Player>`: https://www.remotion.dev/docs/player/player
- Remotion browser executable: https://www.remotion.dev/docs/options/browser-executable
- Remotion cancel render: https://www.remotion.dev/docs/renderer/make-cancel-signal
- Remotion render overview: https://www.remotion.dev/docs/render
- Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security
- Electron context isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron preload: https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
- Remotion licensing: https://www.remotion.dev/docs/license/pricing
- FFprobe official docs: https://ffmpeg.org/ffprobe.html

**Ghi chú pháp lý:** Có sự khác biệt giữa việc cá nhân tự dùng và phân phối/bán công cụ tự động hóa video. Codex cần đọc điều khoản Remotion và giấy phép codec/binary trước khi đưa ra tư vấn thương mại hóa, không tự khẳng định mọi tình huống đều miễn phí.

---

## 22. CHỐT PHẠM VI

Sản phẩm hoàn thành đúng đặc tả khi người dùng **chỉ cần đưa voice và bộ ảnh vào phần mềm**, không phải chỉnh từng ảnh, vẫn có một MP4 đẹp kiểu ProShow, chuyển cảnh mềm, chuyển động nhẹ, ảnh lệch tỉ lệ tự được đặt trên **nền làm mờ từ chính ảnh**, và tất cả đều chạy cục bộ trên Windows.

**Ưu tiên tuyệt đối:** chạy đúng, frame/timing chính xác, preview khớp export, EXE chạy offline, rồi mới bổ sung thêm hiệu ứng.
