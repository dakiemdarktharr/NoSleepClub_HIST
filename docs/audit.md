# Audit bản test

Ngày kiểm tra: 28/10/2026. Báo cáo được cập nhật sau kiểm tra trình duyệt và triển khai; không phải chứng nhận kiểm toán độc lập.

## Phạm vi và ranh giới

- Role User/Dev là test; không giả danh một hệ thống đăng nhập đã hoàn chỉnh. Quyền ghi / đọc của phòng dựa trên khóa ngẫu nhiên 256-bit; database chỉ lưu hash.
- QR phòng chỉ có khóa đọc trong fragment URL. Fragment được lấy ra rồi xóa khỏi thanh địa chỉ, không gửi trong HTTP URL / referrer. Không commit QR có khóa phòng.
- Không có endpoint liệt kê toàn bộ phòng hoặc đọc video không cần khóa. Mọi truy vấn footage kèm room ID; khóa đọc không ghi / xóa được.
- Xác minh UUID, định dạng khóa, kích thước payload, nhãn, model version, embedding và ORB descriptors ở server. Trả lỗi tổng quát cho driver để không lộ URI.
- Video chia chunk, giới hạn quota, giới hạn tạo phòng, unique indexes. Chỉ publish nguồn tham chiếu sau khi đủ chunk và frame. Dữ liệu dở không làm model reference.
- Secret MongoDB chỉ ở server và `.env.local` đã gitignore. Không dùng biến public `VITE_` cho secret. Không đưa ảnh căn phòng hoặc footage thật vào repo.
- Production công khai để test; preview còn SSO và không có credential production. Có CSP, chặn iframe, `nosniff`, `no-referrer`, chỉ cho camera cùng origin, không cho micro / geolocation.
- CSP trang chính không cho JS eval. Riêng response của worker nhận diện có CSP cho `unsafe-eval` vì OpenCV Emscripten tạo các binding bằng `new Function`; ngoại lệ chỉ áp dụng worker có mã đã khóa phiên bản. Worker không được gửi khóa đọc / ghi của phòng và không có DOM. Cần kiểm tra lại nếu thay build OpenCV.
- Atlas `0.0.0.0/0` được chủ tài khoản chấp thuận riêng ngày 28/10/2026 cho project test. Đây là giới hạn an toàn còn lại của hạ tầng test; cần egress cố định và access list hẹp trước sản xuất.

## Tính đúng và giới hạn

- Ngưỡng reject, khoảng cách ứng viên, mẫu âm, xác minh hình học và temporal gate cùng quyết định tên. Không có LLM tự đặt tên / suy đoán địa điểm.
- Footage kiểm thử không nằm trong reference index. Khung hình mờ bị loại theo heuristic; không khẳng định phát hiện hoàn hảo mọi blur.
- Chưa có dữ liệu căn phòng thật của người dùng. Kiểm tra tự động / ảnh nhân tạo chỉ xác minh phần mềm và luồng dữ liệu.
- Chưa có xác thực danh tính, khôi phục khóa Dev hoặc vận hành sản xuất. Người có QR phòng có thể đọc / tải footage phòng đó. Camera User không upload.

## Kết quả kiểm tra

- Unit tests ban đầu: 9/9 đạt.
- TypeScript và production build ban đầu: đạt.
- Dependency audit sau cập nhật Transformers.js, Zod và esbuild: 0 lỗ hổng đã biết.
- Kết nối MongoDB bằng credential mới: ping thành công.
- Model DINOv2 + OpenCV tải thành công trong browser ở luồng Dev. Các kiểm tra ghi / lưu / nhận diện tiếp theo được bổ sung trước bàn giao.
- Đã quay hai cảnh nhân tạo bằng MediaRecorder, lấy frame bằng DINOv2 thật, lưu video / features / nhãn vào MongoDB, đổi sang User và nhận đúng cả hai cảnh sau kiểm tra ORB + RANSAC + temporal gate.
- Ảnh blur 12px và tường trống nhân tạo trả `...`. Không dùng kết quả này để công bố tỷ lệ chính xác trên cảnh thật.
- Round trip video chunks: 262.244 byte qua hai request, đọc lại khớp từng byte. Từ chối complete khi thiếu chunk (409).
- Khóa chỉ đọc tải được metadata / video (200), bị chặn xóa (403); khóa sai bị chặn (403).
- Phiên trình duyệt mới với QR phòng: tải đúng hai footage, không có khóa ghi; fragment được xóa sau khi đọc. Màn hình 390px không tràn ngang; QR hiển thị được.
- Đã xóa footage nhân tạo sau các kiểm tra.
- Node test đã nâng riêng trong `.tools` lên 24.22.1 và kiểm tra SHA-256 theo file chính thức; không thay Node toàn máy.
