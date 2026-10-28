# Hướng thiết kế HIST

Brief: màn đầu chỉ User / Dev; camera là nội dung chính; bản đồ có hai ô địa điểm, ba phương tiện, kết quả rõ ràng trên mobile. Giao diện lấy cảm hứng từ ảnh hoa văn gạch bông, đường mây/rồng và báo Sài Gòn người dùng cung cấp. Không đưa các ảnh clipboard vào repo public.

## Tokens và bố cục

- Giấy ngà `#ede5d3`, giấy sáng `#f8f3e8`, mực xanh `#243b32`, đỏ sơn son `#8e3e34`, nét đồng `#9c8852`, chữ phụ `#6b7165`.
- Phudu 600/700 cho tít báo và nhãn nơi chốn; Be Vietnam Pro 400/600 cho thao tác, ô nhập và hướng dẫn. Các subset Latin / Vietnamese được đóng gói cùng app, không gọi font từ bên thứ ba.
- Màn đầu: masthead, một tít chuyển chữ, đúng hai nút. Không footer liên kết, QR, dải thông số hay mô tả tính năng ở đây.
- User / Dev: thanh công cụ hẹp, camera lớn, thao tác chính đặt ngay trên viewfinder. Thư viện và QR trong drawer. Bản đồ dùng canvas lớn, một search sheet và một route sheet; form thu gọn sau khi có đường đi.
- Hoa văn là vector gốc, không phải scan lại các mẫu tham khảo. Lồng đèn, đường mây/rồng và cảnh mực chỉ dùng ở màn mở đầu / placeholder; không chèn họa tiết lên video đang nhận diện hoặc làm mờ bản đồ.

## Rà các dấu hiệu thiết kế rập khuôn

Đã bỏ các thẻ vai trò dài, icon-box trang trí, nhiều đoạn giới thiệu cùng nghĩa, bảng công cụ cạnh video, nền xanh công nghệ và hệ card bo tròn đồng loạt. Dùng đường kẻ và bố cục báo vì brief yêu cầu báo cũ, không đặt số thứ tự trang trí hoặc nhãn viết hoa trên mọi khối. Không có phần trăm “tự tin” giả hoặc slogan thay cho trạng thái thao tác.

Các thông tin có giá trị vẫn giữ: đang quay, frame rõ, lỗi và cách thử lại, trạng thái huấn luyện, khu vực đã xác nhận, trạm lên/xuống, số xe và chiều tuyến. Thông tin kỹ thuật / kiểm thử được mở khi cần.

## Chuyển động

Tham khảo [typewriter](https://motion.dev/examples/js-typewriter-change-content), [hover](https://motion.dev/examples/svelte-hover), [press](https://motion.dev/examples/svelte-press), [iris từ click](https://motion.dev/examples/js-curtains-iris-click), [stagger wipe](https://motion.dev/examples/react-curtains-stagger-wipe). Link stagger-wipe JavaScript trong brief không truy cập được lúc khảo sát; dùng mô tả cùng hiệu ứng ở ví dụ React. Không sao chép source Motion+ trả phí; iris/wipe/typewriter là code gốc. Hover và press dùng API Motion công khai, có xử lý pointer/keyboard. `prefers-reduced-motion` bỏ chuyển động và giữ thao tác đầy đủ.

UI UX Designer được dùng cho phân cấp, trạng thái, mobile và motion; frontend-design dùng để tự phê bình các mặc định rập khuôn theo đúng brief. [Concept Canva](https://canva.link/k4owrsn9esxxn5t) là tài liệu tham khảo thiết kế, không phải app đã triển khai.
