# Bản 1.0.1: thư viện logo, chỉnh sub trên preview và xóa ảnh

GitHub: [mã nguồn](https://github.com/nduc8868x-tech/auto-proshow-studio) · [tải bản portable Windows](https://github.com/nduc8868x-tech/auto-proshow-studio/releases/latest). Giải nén toàn bộ ZIP rồi mở `auto-proshow-studio.exe`. Mã nguồn gồm template, tài liệu, tests và fixture benchmark; bộ cài portable được lưu tại Releases.

Bản portable mới nằm ở **release/2026-10-24-logo-preview/auto-proshow-studio-win32-x64/auto-proshow-studio.exe**. Đóng bản cũ rồi mở EXE mới để dùng các điều chỉnh mới.
Gói chuyển sang máy khác: **release/AutoProShowStudio-Windows-x64.zip**. Giải nén toàn bộ thư mục rồi mở EXE.

- Ảnh: AVIF/JPG/JPEG/JFIF/PNG/WebP/GIF/BMP/ICO/SVG. Nhập file có báo số thành công và file lỗi; HEIC/TIFF cần chuyển đổi.
- **Tốc độ chuyển động (toàn dự án)**: 0,00×–10,00×, mặc định dự án mới **3,00×**. Mức 0× dừng chuyển động. Chọn ảnh, cuộn tới **Ảnh đang chọn → Chuyển động**, bật **Tốc độ riêng cho ảnh này** để ghi đè. Giữ nguyên thời lượng ảnh, voice và video; dự án cũ giữ thiết lập đã lưu.
- **Hiển thị ảnh** mặc định dự án mới là **Nền ảnh làm mờ**. Bấm **×** trên thumbnail để xóa ảnh, kể cả khi chưa nhập voice. Kéo ảnh ngay trên timeline sang trái/phải; vạch tím báo vị trí chèn. Thứ tự được lưu và giữ thiết lập riêng từng ảnh.
- **Template Subscribe** dưới timeline: đặt playhead tại thời điểm cần chèn, bấm **＋ Mẫu Subscribe** để dùng GIF đã gửi có sẵn, tự tách nền xanh. Kéo đoạn để đổi lúc xuất hiện, kéo mép phải để đổi thời lượng. Bấm vào đoạn để chỉnh thời điểm/vị trí/kích thước, bật lặp hoặc xóa. Bấm **Chỉnh vị trí sub** trên preview để kéo vị trí hoặc kéo góc đổi kích thước, tự lưu khi thả chuột. Chỉnh số xong bấm **Lưu chỉnh sửa**. Các đoạn nằm cùng một hàng; chọn đoạn rồi **Sao chép / Dán tại playhead** hoặc **Ctrl+C / Ctrl+V** trong track. Có danh sách chọn đoạn khi chồng thời gian. Có **Nhập GIF khác…**, tùy chọn tách nền xanh. Xem docs/SUBSCRIBE-TEMPLATE.md.
- Bên phải, cuộn tới **Tiêu đề & logo xuyên suốt**: bật dải trắng, nhập tiêu đề, bấm **＋ Thêm logo** để thêm một hoặc nhiều logo vào **Logo đã lưu**, dùng lại cho các dự án; có thể bỏ logo hiện tại. Chỉnh X/Y, chiều rộng/cao và cỡ chữ; chọn bố cục Trên/Giữa/Dưới. Bấm **Chỉnh vị trí** trên preview để kéo cả dải hoặc kéo góc để đổi kích thước. Logo đi cùng dải tiêu đề, cố định tại vị trí đã chọn suốt video.
- **Quản lý dự án**: mỗi dự án một hàng ngang có tên, ảnh nhỏ, số ảnh, thời lượng, thời gian tạo/sửa và nút Mở/Đổi tên/Xóa. Có tìm kiếm và sắp xếp. Xóa có xác nhận và chuyển thư mục dự án vào Thùng rác. File nguồn/video ngoài thư mục dự án được giữ. Hủy các mục chờ/đang xuất của dự án trước khi xóa.
- Bấm **Thêm vào hàng đợi** cho từng dự án. Có thể tiếp tục sửa dự án khác; mỗi mục giữ bản chụp lúc thêm. Hủy từng mục hoặc tạm dừng sau video hiện tại. Hàng đợi được lưu trên đĩa.
- Chế độ **Tự động GPU / CPU** tự kiểm tra máy đang dùng; NVIDIA NVENC nếu khả dụng, tự chuyển CPU khi không dùng được. Không khóa vào RTX 2060 SUPER.
- **CPU tương thích** dùng cho máy không có GPU tương thích. GPU có thể dựng tối đa 8 frame đồng thời, giới hạn theo CPU/RAM/độ phân giải. Nền mờ được chuẩn bị một lần và cache dùng chung giữa các frame; tự dùng CSS blur nếu không tạo được cache. GPU dùng ANGLE và NVENC, vẫn cần CPU để điều phối và dựng nội dung.
- Đóng gói bản này: `npm run package:portable -- release/2026-10-24-logo-preview`. Tạo ZIP: `npm run zip:portable -- -BuildDirectory release/2026-10-24-logo-preview`. Probe GPU: `npm run probe:gpu`.
- Chi tiết bản hiện tại: docs/UPDATE-2026-10-24.md. Bố cục tiêu đề: docs/UPDATE-EDITOR-CONTROLS.md. Chưa kiểm tra máy Windows sạch tắt mạng hoặc video dài 10–20 phút.

---

# Auto ProShow Studio

Ứng dụng desktop Windows 10/11 x64 tạo slideshow từ ảnh và một file voice. Toàn bộ media được xử lý cục bộ.

## Chạy EXE

Mở **release/2026-10-24-logo-preview/auto-proshow-studio-win32-x64/auto-proshow-studio.exe**.
Giữ nguyên toàn bộ thư mục bên cạnh EXE, bao gồm resources, DLL và browser. Đây là bản portable, chưa có installer/signing.

## Phát triển trên Windows

Đã kiểm tra với Node.js 24.22.1, npm 11.19.1, Electron 40.10.2 và Remotion 4.0.538. Sau khi cài Node.js, mở terminal mới.

```powershell
cd "D:\tool edit\auto-proshow-studio"
npm ci
npm run dev
```

Chọn hoặc tạo dự án, nhập AVIF/JPG/JPEG/PNG/WebP và một MP3/WAV. Có thể kéo file từ Explorer vào cửa sổ. Ảnh được sắp xếp natural order khi nhập; kéo thumbnail để đổi thứ tự. Chọn ảnh để chỉnh motion, tốc độ, transition và fit riêng. Thay preset, khung hình hoặc thông số nền mờ, lưu dự án rồi xuất MP4.

Ctrl+S: lưu. Ctrl+E: thêm video vào hàng đợi xuất. Space: phát/dừng khi không nhập liệu. Ứng dụng lưu thiết lập hiện tại trước khi chuyển/tạo dự án hoặc nhập thêm media.

Ảnh được chuẩn hóa thành PNG đủ độ phân giải bằng decoder Chromium, có xử lý EXIF; thumbnail lưu riêng. Giới hạn decoder: 100 megapixel/ảnh. Không chỉnh sửa file nguồn. Media đã xóa khỏi timeline vẫn được giữ trên đĩa để tránh mất dữ liệu ngoài ý muốn.

## Kiểm tra và đóng gói

```powershell
npm run typecheck
npm run lint
npm test
npm run smoke:render
npm run smoke:app
npm run package:win
npm run package:portable
npm run zip:portable
```

smoke:render tự sinh 3 ảnh khác tỷ lệ và WAV 8 giây, render 720p và xác minh FFprobe.
smoke:app khởi động Electron ẩn, kiểm tra JPEG/WebP/EXIF, import, lưu/mở lại, UI, xuất 1080p và hủy render sau 20%. Chạy smoke:render trước để tạo fixture.
package:win sử dụng Forge template chính thức, đóng gói composition, compositor và Chrome Headless Shell. Lần cài dependency/đóng gói đầu cần Internet. Đầu ra: out/auto-proshow-studio-win32-x64/.

Kiểm thử EXE (PowerShell, đường dẫn tuyệt đối):

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
& ".\release\2026-10-24-logo-preview\auto-proshow-studio-win32-x64\auto-proshow-studio.exe" --app-smoke "D:\tool edit\auto-proshow-studio\fixtures\generated"
```

Kết quả kiểm thử nằm trong fixtures/generated: verification.json, packaged-result.json, electron-result.json, ảnh chụp editor và MP4 mẫu. File app-smoke-error.txt có thể là log từ lần kiểm tra thất bại trước đó; đối chiếu timestamp và result.json.

## Dữ liệu và tài liệu

Dự án thực tế: %APPDATA%/AutoProShowStudio/projects. Log lỗi xuất: %APPDATA%/AutoProShowStudio/logs/app.log. Test dùng thư mục app-test-data riêng trong fixtures/generated.
Xem PROGRESS.md cho kết quả thực tế, TODO.md cho phần chưa xác minh, docs/ARCHITECTURE.md và docs/TROUBLESHOOTING.md.

Dựa trên https://github.com/remotion-dev/template-electron. Tất cả remotion và @remotion/\* được pin 4.0.538; package-lock.json đã tạo. Kiểm tra license Remotion và binary/codec trước khi phân phối; dự án chưa kèm chứng thư ký số.
