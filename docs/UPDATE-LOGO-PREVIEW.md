# Thư viện logo, chỉnh sub trên preview và xóa ảnh

Trong **Tiêu đề & logo xuyên suốt**, bấm **＋ Thêm logo** để chọn một hoặc nhiều ảnh. Các logo tự lưu trong **Logo đã lưu**. Bấm thumbnail để dùng lại cho dự án hiện tại; dự án mới cũng thấy thư viện này. Nhập lại cùng nội dung không tạo bản trùng. Logo hiện tại của dự án cũ được bổ sung vào thư viện khi mở dự án đó. **Bỏ logo** chỉ bỏ khỏi video hiện tại.

Thư viện nằm dưới `%APPDATA%/AutoProShowStudio/logo-library`, dùng theo người dùng trên máy hiện tại. Khi chọn logo đã lưu, ứng dụng sao chép PNG và thumbnail vào thư mục dự án. Video chờ xuất giữ bản logo riêng tại lúc thêm hàng đợi; các thay đổi sau đó không sửa bản chụp đó. ZIP ứng dụng không chứa thư viện cá nhân.

Trên preview, bấm **Chỉnh vị trí sub** rồi kéo khung xanh để di chuyển hoặc kéo góc để đổi kích thước. Ứng dụng tự tua đến sub được chọn và tự lưu khi thả chuột. Danh sách sub trên preview và timeline dùng chung lựa chọn. Các số X/Y/kích thước cập nhật ngay; lịch và thời lượng không đổi. Phím mũi tên căn chỉnh, Shift để tăng bước. Khung chỉ xuất hiện khi chỉnh sửa.

Trong thư viện ảnh, bấm **×** trên thumbnail để xóa ảnh khỏi dự án, kể cả trước khi nhập voice. Timeline tự chia lại thời gian cho ảnh còn lại, giữ thời lượng voice và thiết lập riêng từng ảnh. Xóa ảnh cuối cùng đưa preview về trạng thái trống và giữ voice. File nguồn và bản sao media trên đĩa vẫn còn để các bản chụp trong hàng đợi dùng được.

Build mới: `release/2026-10-24-logo-preview/auto-proshow-studio-win32-x64/auto-proshow-studio.exe`.

## Kiểm tra bản 1.0.1

Lint/typecheck và 34 tests đạt. Dev smoke và EXE portable thực tế đều đạt với logo dùng lại giữa dự án, chống ghi trùng đồng thời, lưu/mở lại và bản sao logo riêng; xóa trước voice, xóa ảnh còn lại/cuối cùng, giữ voice và media nguồn; kéo/resize Subscribe bằng chuột thật, tự lưu và đồng bộ timeline. Đối chiếu PNG/MP4 của sub ở trong/ngoài lịch vẫn đạt; các kiểm tra tiêu đề, import, hàng đợi NVENC/CPU và hủy xuất đạt. Bản này không có thay đổi tối ưu tốc độ xuất.
