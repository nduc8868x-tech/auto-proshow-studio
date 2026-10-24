# Chuyển động, bố cục tiêu đề và quản lý dự án

## Cách dùng

- Kéo **Tốc độ chuyển động (toàn dự án)** trong cột phải: 0,00×–10,00×, mặc định dự án mới 3,00× (cập nhật 24/10/2026). Mức 0 dừng chuyển động. Với từng ảnh, chọn thumbnail/timeline, cuộn tới **Ảnh đang chọn**, bật **Tốc độ riêng cho ảnh này** rồi kéo thanh tốc độ. Bỏ chọn để dùng lại tốc độ chung.
- Tốc độ điều chỉnh quãng pan/zoom trong thời gian hiện có; ảnh không kết thúc chuyển động sớm rồi đứng hình. Giữ nguyên thời lượng voice, ảnh và timeline. Chế độ `none` không có pan/zoom ảnh chính. Giới hạn di chuyển vẫn bảo vệ ảnh trong chế độ giữ nguyên/nền mờ.
- Bật **Tiêu đề & logo xuyên suốt**, nhập chữ, chọn/thay/bỏ logo. Dùng Trên/Giữa/Dưới hoặc thanh X/Y, rộng/cao, cỡ chữ. Tắt **Tự co chữ khi tiêu đề dài** nếu cần giữ đúng cỡ chữ đã chọn; chữ quá dài có thể vượt vùng và bị cắt.
- Bấm **Chỉnh vị trí** trên preview để kéo dải tiêu đề; kéo tay nắm góc phải dưới để đổi kích thước. Khi khung được chọn, phím mũi tên căn chỉnh 0,5%; Shift+mũi tên: 2%. Bấm **Xong chỉnh vị trí** để ẩn khung chọn. Khung chọn không xuất vào video.
- Logo và nền trắng đi cùng bố cục tiêu đề; giữ vị trí đó xuyên suốt, kể cả chuyển cảnh. Tọa độ/kích thước dùng phần trăm khung hình; cỡ chữ quy đổi từ chuẩn chiều cao 1080p.
- Bấm **Quản lý dự án** để tìm theo tên (có thể gõ không dấu), sắp xếp, mở, tạo, đổi tên và xóa. Mỗi dự án một hàng ngang có ảnh đầu nhỏ, tên, số ảnh, thời lượng voice, kích thước video, ngày tạo và cập nhật.
- Xóa chuyển toàn bộ thư mục dự án vào Thùng rác sau hộp thoại xác nhận. File nguồn và video bên ngoài thư mục dự án được giữ nguyên. Nếu đã lưu video bên trong thư mục dự án thì video đó cũng đi vào Thùng rác. Dự án có mục đang chờ/xuất không được xóa; hủy các mục đó trước.
- Thiết lập được lưu khi bấm Lưu, chuyển/tạo dự án, mở trình quản lý hoặc thêm vào hàng đợi. Hàng đợi giữ bản chụp thiết lập lúc thêm. Dự án cũ tự nhận tốc độ 1× và bố cục tiêu đề mặc định.

## Triển khai và kiểm tra

- Preview và export dùng cùng Remotion composition, cùng hàm hình học tiêu đề và chuyển động.
- Xóa kiểm tra UUID, thư mục chuẩn nằm trực tiếp trong gốc dự án, ID trong JSON và trạng thái hàng đợi; từ chối junction/symlink. Dùng Windows Recycle Bin thay vì xóa vĩnh viễn.
- Lint/typecheck và 24 tests: PASS. Bao gồm mặc định dự án cũ, giới hạn bố cục/cỡ chữ, tốc độ và giới hạn ảnh, thời lượng voice, lưu tốc độ qua tạo lại hiệu ứng, từ chối đường dẫn ngoài gốc và junction.
- Smoke test dùng userData riêng trong `fixtures/generated/app-test-data`, thực hiện kéo/đổi cỡ bằng pointer thật, đổi tên/tìm kiếm giao diện, chuyển một dự án fixture vào Thùng rác, bảo vệ file nguồn/video ngoài dự án và chặn xóa khi có mục chờ. Kết quả dev/EXE ở `electron-result.json` / `packaged-result.json`; đối chiếu timestamp để biết lần kiểm tra mới nhất.
- Máy Windows sạch tắt mạng và stress video dài: chưa kiểm tra. Không suy ra tốc độ thực tế của dự án lớn từ fixture 8 giây.

## Bản portable cập nhật

EXE: `release/2026-10-24/auto-proshow-studio-win32-x64/auto-proshow-studio.exe`.
ZIP: `release/AutoProShowStudio-Windows-x64.zip`.
Thư mục riêng giữ phiên ứng dụng cũ đang mở; đóng bản cũ trước khi dùng bản mới với cùng dữ liệu dự án.
Đóng gói lại: `npm run package:portable -- release/2026-10-24`, sau đó `npm run zip:portable -- -BuildDirectory release/2026-10-24`.
