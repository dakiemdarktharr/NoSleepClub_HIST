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
- Kiểm tra production phát hiện module API cần đuôi `.js` khi chạy Node ESM. Đã sửa import, biên dịch riêng bằng NodeNext và chạy module health đã biên dịch: HTTP 200, MongoDB connected. CI được chạy lại trên bản sửa.

## Xác minh sau triển khai

- URL: https://nosleepclub-hist-connected.vercel.app/ — production công khai, không yêu cầu đăng nhập Vercel.
- Project hoạt động: `nosleepclub-hist`, team ACNE, ID `prj_70MScY0LmO2d24FJaxRgWIyG8xfK`. Đã xác minh Git link tới `dakiemdarktharr/NoSleepClub_HIST` bằng danh sách linked projects và bộ lọc repo ID.
- Commit chức năng đã kiểm tra: `c5a683ababea4f3213e74b4bee4cf2480a3734f8`. Push commit này tự sinh production deployment `dpl_BwtVQRXnYAtQYc4FxqRPhEwD8i3w`, trạng thái READY, source git. CI GitHub tương ứng đã thành công.
- `/api/health` trả HTTP 200 với `database: connected` trên HTTPS production.
- Model tải và chạy thật dưới CSP production. Đã quay cảnh bàn nhân tạo bằng MediaRecorder, lọc / trích 4 frame, đặt tên, lưu MongoDB qua API production, chuyển User và nhận đúng tên sau xác minh hình học / thời gian; kiểm tra ghi nhận 202 chi tiết khớp.
- Một cảnh lưới hình lặp lại bị từ chối ở bước xác minh chi tiết thay vì ép trả tên. Điều này minh họa lựa chọn ưu tiên từ chối khi hình học không rõ.
- Đã xóa các footage production nhân tạo sau kiểm tra. QR trong repo chỉ trỏ về trang chủ HTTPS, không có khóa phòng hoặc credential.
- Project tạo ban đầu không có Git link đã được đổi tên `nosleepclub-hist-initial`, bật bảo vệ mọi deployment và xóa giá trị cấu hình MongoDB. Bản bàn giao dùng project đã kết nối Git ở trên.
- Chưa thử camera phần cứng trên điện thoại thật của người dùng. Giao diện được kiểm tra ở viewport 390px và phiên trình duyệt tách biệt; cần thực hiện kế hoạch validation tại căn phòng thật.
