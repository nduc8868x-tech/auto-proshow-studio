# Template Subscribe trên timeline

1. Nhập ảnh và voice để có timeline. Đặt playhead vào thời điểm muốn hiệu ứng xuất hiện.
2. Bên dưới track voice, bấm **＋ Mẫu Subscribe**. Mẫu `download.gif` do người dùng cung cấp đã được đưa vào bản portable dưới tên `templates/subscribe.gif`; không cần giữ file Downloads bên ngoài.
3. Kéo thân đoạn Subscribe để đổi thời điểm. Kéo mép phải để đổi thời lượng. Các thao tác kéo tự lưu.
4. Bấm vào đoạn để chỉnh **Bắt đầu**, **Thời lượng**, **Ngang**, **Dọc**, **Kích thước**. Preview cập nhật ngay; bấm **Lưu chỉnh sửa** hoặc Lưu dự án để giữ các thay đổi số.
5. Bật **Lặp animation** để lặp GIF trong khoảng thời gian đã đặt. Khi không bật lặp, GIF chạy một lần rồi giữ frame cuối đến hết đoạn. Ngoài đoạn này, hiệu ứng biến mất.
6. **Xóa đoạn** bỏ một lần xuất hiện. Có thể thêm mẫu nhiều lần tại nhiều thời điểm; các frame đã giải mã được dùng lại.
7. **Nhập GIF khác…** chọn GIF riêng. Tùy chọn **Tách nền xanh khi nhập GIF khác** mặc định bật; bỏ chọn nếu muốn giữ màu xanh/nền nguyên bản. GIF đưa vào thư viện ảnh thường vẫn là ảnh tĩnh; dùng track này cho animation.

Tất cả đoạn Subscribe nằm trên **cùng một hàng**. Chọn đoạn rồi bấm **Sao chép**, bấm chỗ trống trên track để đặt playhead và bấm **Dán tại playhead**. Khi đang thao tác trong track, dùng **Ctrl+C / Ctrl+V** cũng được. Phím tắt không can thiệp khi đang nhập số/chữ. Bộ nhớ sao chép dùng trong dự án hiện tại và được làm mới khi đổi dự án.

Bản dán giữ mẫu GIF, vị trí, kích thước, thời lượng và chế độ lặp; là một đoạn riêng, tự lưu, có thể sửa/xóa độc lập. Nếu dán sát cuối video, thời lượng tự rút ngắn cho vừa. Không giải mã hoặc nhân đôi bộ frame GIF. Các đoạn trùng thời gian vẫn được giữ; dùng danh sách **Đoạn Subscribe** để chọn từng đoạn khi chúng che nhau trên hàng.

Template là một lớp chồng lên slideshow và tiêu đề, giữ nguyên thời lượng ảnh/voice/video. Mẫu mặc định nằm phía dưới giữa, phía trên dải tiêu đề mặc định; có thể chỉnh lại vị trí. Các bản chụp trong hàng đợi giữ lịch/thiết lập riêng lúc thêm vào.

Trên preview, bấm **Chỉnh vị trí sub**, hoặc chọn sub trong danh sách cạnh nút. Preview tự tua đến đoạn đó. Kéo khung xanh để di chuyển, kéo góc dưới bên phải để đổi kích thước đúng tỉ lệ. Vị trí được giữ trong khung hình; thả chuột sẽ tự lưu. Phím mũi tên căn từng bước, Shift + mũi tên căn nhanh. Bấm **Xong chỉnh sub** để đóng khung. Sub được chọn dùng chung với track và các ô X/Y/kích thước; khung điều chỉnh chỉ hiện trong editor, không có trong video xuất.

## Cách xử lý

GIF mẫu: 1280×720, 61 frame, 2,03 giây. Chromium WebCodecs giải mã đủ frame theo thời lượng gốc, tách màu xanh có làm mềm alpha và giảm viền xanh; cắt theo hợp vùng nội dung của toàn animation để hình không nhảy vị trí. Lưu PNG trong suốt dưới `media/templates/<uuid>/`. Remotion chọn frame theo thời gian video, không dựa vào đồng hồ GIF của trình duyệt; tua, pause, dựng song song và xuất đều dùng cùng cách chọn frame.

Trang decoder là file cục bộ tin cậy, sandbox/context isolation, không có script hoặc truy cập mạng từ nội dung GIF. Frame URL dùng media server có token phiên. Metadata template bất biến và đường dẫn được xác minh trong thư mục dự án. Xóa đoạn giữ frame trên đĩa để tái sử dụng và phục vụ các job chờ; xóa dự án vào Thùng rác bao gồm các frame này. Dự án cũ tự nhận track trống.

Giới hạn nhập: GIF tối đa 50 MB, 600 frame, tổng 200 triệu pixel giải mã; 50 mẫu khác nhau và 100 đoạn mỗi dự án. Đoạn được giới hạn theo độ dài video, tự căn lại nếu voice ngắn đi. Giới hạn nhằm tránh hết RAM; lỗi nhập được hiển thị.

Tham khảo API: [ImageDecoder](https://developer.mozilla.org/en-US/docs/Web/API/ImageDecoder), [VideoFrame.duration](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame/duration).

## Kiểm tra

34 tests và lint/typecheck đạt. Dev smoke và EXE portable mới đều đạt với đúng GIF mẫu, đủ 61 frame/2030 ms, alpha trong suốt, animation khác nhau giữa các frame; kéo chuột đổi thời điểm/thời lượng, sửa X/Y/kích thước, lặp, xóa/thêm lại, tái sử dụng asset và lưu/mở lại. Kiểm tra nút và phím Ctrl+C/V thật: dán tại playhead, ID độc lập, giữ hình học/lặp, cắt thời lượng cuối video, cùng một hàng kể cả khi chồng nhau, chọn đoạn bằng danh sách và không chặn phím khi nhập liệu. MP4 được so pixel với frame PNG tại giây 3 và 4,2; không xuất hiện tại giây 1 và 6 trong lịch 2–5 giây.

Bản portable mới: `release/2026-10-24-logo-preview/auto-proshow-studio-win32-x64/auto-proshow-studio.exe`. ZIP: `release/AutoProShowStudio-Windows-x64.zip`. Kết quả EXE ở `packaged-result.json`, đối chiếu timestamp; kiểm thử máy sạch và video dài vẫn chưa chạy.
