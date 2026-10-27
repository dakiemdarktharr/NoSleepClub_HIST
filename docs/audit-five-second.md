# Sửa luồng quay 5 giây và học để dùng lại

Ngày 28/10/2026. Thay thế các cổng nhận diện v1 trong audit cũ.

## Nguyên nhân được tái hiện

- Đã kiểm tra chỉ đọc một footage thực tế có 6 frame rõ. Bản v1 từ chối cả 6 khi dùng chính các frame đã lưu làm query: trung bình top-2 làm tụt điểm nếu hai góc không chồng lấn, sau đó lại yêu cầu khớp hình học hai ảnh hỗ trợ.
- V1 chạy inference trong vòng quay và loại ảnh gần trùng. Trên thiết bị chậm hoặc camera đứng yên, clip ngắn có thể còn rất ít mẫu; frame đang xử lý khi dừng cũng bị bỏ.
- V1 chỉ lưu features, không publish bộ phân loại đã fit để User nạp lại.

## Thay đổi

- Capture độc lập với inference, khoảng 5 frame/giây; tự dừng sau 5 giây. Sau khi đặt tên, chọn tối đa 8 frame rõ trải đều thời gian, trích DINOv2 và fit classifier. Video gốc được giữ nguyên.
- Spherical prototype classifier, tối đa 3 prototype/nhãn, cùng tập hỗ trợ gọn tối đa 24 ảnh cho cả phòng. Không yêu cầu 3 ảnh khác nhau hoặc 2 ảnh đồng thời khớp hình học để thừa nhận một góc nhìn đã biết.
- Khớp rất mạnh trả tên từ frame đầu. Nhận diện vừa phải có thể được xác minh bằng một ảnh hỗ trợ; bằng chứng yếu cần thêm một frame. Không đủ bằng chứng hoặc mẫu âm thắng thì trả `...`.
- Artifact được lưu MongoDB, kiểm tra model version / manifest nguồn, cache IndexedDB và chuẩn bị ngay khi chọn vai trò. User thiết bị mới tải artifact có sẵn thay vì train lại.
- Khóa đọc gọi được `model.get`, không được `model.save`. Kiểm tra schema vector / nhãn / giới hạn kích thước, đối chiếu nguồn đúng phòng và optimistic dataset version khi lưu. Thêm/xóa footage vô hiệu hóa artifact cũ.
- Footage cũ được dùng lại. Utility sửa classifier chỉ sửa artifact dẫn xuất, giữ video và frame gốc; không xuất ảnh, vector, khóa hoặc tên riêng ra log công khai.
- Có timeout worker để tránh chờ vô hạn. Không có dependency mới.

## Bằng chứng hiện có

- Regression dữ liệu cũ: 0/6 tự khớp ở v1 → 6/6 tự khớp với classifier mới; đã lưu artifact mới cho phòng tương ứng. Đây là kiểm tra tái hiện lỗi, không phải accuracy trên camera mới.
- Browser với DINOv2 thật và camera giả lập: video tĩnh tự dừng sau khoảng 5 giây, giữ 26 frame rõ thay vì loại sạch vì trùng.
- Đã học từ một video cho cảnh bàn và một video cho cảnh kệ; User nhận đúng cả hai. Suy luận đo trên máy thử khoảng 622–857 ms/frame khi model đã sẵn sàng. Không coi đây là cam kết tốc độ trên mọi điện thoại.
- Cảnh chưa học và blur 12px trả `...` trong kiểm tra. Không hạ mọi điều kiện chỉ để ép ra tên.
- Phiên trình duyệt mới qua QR chỉ có read key: nạp artifact hai lớp, nhận diện được; không gọi `frames.get` để tải toàn bộ gallery / fit lại. Ghi artifact bằng read key bị chặn HTTP 403.
- TypeScript và 15 unit tests hiện đạt. Bao phủ one-shot, các góc không chồng lấn, mẫu âm, mơ hồ, frame đứng yên, nguồn thay đổi, first-frame result và schema artifact.

## Giới hạn

Một clip 5 giây tạo được bộ mẫu của khu vực, không chứng minh rằng mọi góc nhìn / ánh sáng chưa quay sẽ được nhận đúng. Khớp quá giống giữa các nơi vẫn có thể gây mơ hồ. Cold start tải backbone trên thiết bị mới không thể có độ trễ bằng không. Chưa đo bằng camera phần cứng của người dùng; cần thử tại phòng thật sau khi cập nhật.

Kiểm tra production và commit được xác nhận qua CI / deployment trước bàn giao; phần này ghi các phép thử phần mềm, không phải chứng nhận kiểm toán độc lập.
