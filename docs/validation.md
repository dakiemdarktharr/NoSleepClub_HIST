# Kiểm chứng tại căn phòng thật

## Thu mẫu

- Hai nơi có tên rõ ràng. Bắt đầu bằng **một footage 5 giây cho mỗi nơi**, rồi đặt tên và bấm “Lưu & huấn luyện”. Giữ máy ổn định, di chuyển góc nhẹ; không đổi giữa hai nơi trong cùng một footage. Chỉ bổ sung góc nhìn nếu kiểm thử thực tế còn thiếu độ phủ.
- Thêm footage cảnh khác: tường, cửa, sàn và góc không đăng ký. Đặt cờ cảnh khác.
- Thu các footage **Kiểm thử riêng** ở lượt khác, tốt nhất khác thời điểm / ánh sáng. Không dùng lại frame tham chiếu làm query đánh giá.

## Thử User trên điện thoại

1. Dùng QR phòng trên thiết bị khác; xác nhận đúng danh sách nhãn và footage.
2. Mỗi nơi thử từ xa / gần, lệch trái / phải và che một phần. Chờ kết quả ổn định.
3. Quay sang cảnh thứ ba, tường trống và hướng máy di chuyển nhanh. Kỳ vọng `...` thay vì tên tùy tiện.
4. Chuyển A → B, A → cảnh lạ, tắt camera, đưa app ra nền rồi trở lại. Không được giữ vô hạn nhãn từ khung cảnh cũ.
5. Dùng ít nhất một iPhone Safari và một Android Chrome. Ghi thời gian tải model, tốc độ nhận diện, nhiệt / pin và lỗi camera / codec.

## Báo cáo

Ghi số lượt đúng, nhầm A↔B, từ chối ở A/B, cảnh lạ bị nhận thành A/B, thời gian đến nhãn đầu tiên và thời gian xóa nhãn khi cảnh đổi. Báo cáo cả độ phủ (bao nhiêu lần app dám trả tên) và độ chính xác khi đã trả tên.

Nút kiểm thử riêng trong Dev cho thống kê theo frame trên các footage tách riêng. Frame trong một clip có tương quan, nên số này không thay thế thử theo lần ghé / clip độc lập. Không gọi cosine 0,9 là “90% chắc chắn”.

Nếu nhầm: ưu tiên dữ liệu đa dạng, tên vùng không chồng lấn, cảnh khác khó và ngưỡng thận trọng. Nếu chủ yếu trả `...`: xem độ sáng, độ nét, chi tiết ORB và độ bao phủ góc nhìn trước khi nới ngưỡng. Không hạ ngưỡng chỉ để demo luôn trả một tên.
