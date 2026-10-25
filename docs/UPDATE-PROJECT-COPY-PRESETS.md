# Bản 1.0.2: sao chép dự án và hai mẫu Subscribe

Bấm **Sao chép dự án** trên thanh trên cùng, hoặc **Sao chép** ở hàng dự án trong **Quản lý dự án**. Ứng dụng lưu chỉnh sửa đang làm rồi mở bản sao. Bản sao giữ ảnh, voice, logo, tiêu đề, hiệu ứng và lịch Subscribe; có ID và file media riêng để chỉnh sửa độc lập. Cache nền mờ được tạo lại khi cần. Các job xuất đã có không được nhân đôi.

Dự án mới mặc định tốc độ chuyển động **7,00x** và cỡ chữ tiêu đề **180 px** (chuẩn 1080p). Dự án có thiết lập đã lưu và các bản sao giữ nguyên thiết lập đó. **Tự co chữ khi tiêu đề dài** vẫn có thể làm cỡ chữ hiển thị nhỏ hơn mức đã chọn để vừa dải tiêu đề.

Phần **Template Subscribe** có hai nút:

| Mẫu   | Số đoạn | Thời lượng mỗi đoạn | Ngang | Dọc | Kích thước |
| ----- | ------- | ------------------- | ----- | --- | ---------- |
| Mẫu 1 | 15      | 10 giây             | 36%   | 8%  | 29%        |
| Mẫu 2 | 5       | 2 giây              | 25%   | 11% | 51%        |

Hai mẫu đều dùng GIF Subscribe có sẵn, **tách nền xanh** và **lặp animation**. Đoạn đầu bắt đầu ở đầu video, đoạn cuối kết thúc ở cuối video; các điểm bắt đầu được chia đều, sai số làm tròn tối đa một frame. Thời lượng từng đoạn giữ nguyên. Video ngắn có thể có các sub chồng thời gian; chọn từng đoạn trong danh sách để chỉnh.

Mặc định nút mẫu **thêm** các đoạn vào track đang có. Bật **Thay các sub hiện có** nếu muốn đổi toàn bộ lịch sang một mẫu mới. Mẫu 1 cần video ít nhất 10 giây, mẫu 2 ít nhất 2 giây; nút bị khóa khi chưa đủ thời lượng, chưa có timeline hoặc vượt giới hạn 100 đoạn. Không rút ngắn âm thầm thời lượng cố định. Các frame GIF được dùng lại; lịch và thiết lập được tự lưu.

EXE mới: `release/2026-10-26-presets/auto-proshow-studio-win32-x64/auto-proshow-studio.exe`.

## Kiểm tra

Lint/typecheck và 37 tests đạt. EXE 1.0.2 thực tế đạt kiểm tra sao chép từ cả thanh trên và quản lý dự án, ID/file riêng và byte media giống nguồn, giữ thiết lập và bản gốc; hai mẫu đúng số đoạn/thời lượng/tọa độ, tách nền/lặp, thêm/thay thế, lưu/mở lại và dùng lại GIF. Video xuất kiểm tra pixel sub/tiêu đề, hàng đợi NVENC/CPU và hủy xuất đều đạt. Dev UI cũng đạt các bước mới, nhưng lượt xuất từ bundle phát triển bị timeout khởi tạo trình duyệt; bản EXE có bundle dựng sẵn xuất thành công.
