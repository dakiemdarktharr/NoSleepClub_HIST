# Audit bản giao diện Đông Dương, nhận diện v3 và bản đồ

## Thay đổi chính

- Landing chỉ có User / Dev, không các nút phụ. Công cụ phụ thu vào drawer. Phudu / Be Vietnam Pro tự phục vụ, hỗ trợ dấu tiếng Việt. Vector trang trí gốc lấy cảm hứng từ reference, không công khai các ảnh đính kèm của người dùng.
- Motion hover/press, title typewriter, iris khi vào vai trò và stagger wipe khi trở về; reduced motion, focus, keyboard và modal focus trap.
- Snapshot camera trùng phần ảnh hiển thị `object-fit: cover`, sửa lệch cảnh giữa video cảm nhận được và ảnh model xử lý trên màn portrait. ORB trải đều 4×4 ô, không dành toàn bộ điểm cho một vùng chữ/họa tiết.
- Classifier v3 học thêm mức lân cận mẫu âm / lớp cạnh tranh. Mọi kết quả hiện tên đều cần hình học, không còn chấp nhận chỉ vì cosine cao. So tối đa ba lớp / bốn ảnh hỗ trợ mỗi lớp; từ chối nếu lớp cạnh tranh có hình học gần tương đương. Nhãn mới yếu cần xác nhận thêm, ảnh chưa biết vẫn xóa nhãn ngay.
- Bản đồ vẽ trong HIST; geocoding, đường bộ và tuyến công cộng dùng dữ liệu thật. Không chuyển người dùng qua Google Maps hoặc dùng profile ô tô cho xe máy.

## Routing và nguồn dữ liệu

[Valhalla route API](https://valhalla.github.io/valhalla/api/route/api-reference/) hỗ trợ `shortest` và `motor_scooter`. App yêu cầu distance costing; motor scooter tắt hierarchy pruning trong giới hạn engine. “Ngắn nhất” áp dụng cho đồ thị hiện có và giới hạn thuật toán/provider, không chứng minh mọi con đường thực tế đều có trong OSM. Hướng dẫn trả về bằng tiếng Việt; ETA là ước tính, không có live traffic.

Tuyến, thứ tự trạm và hình học lấy từ [EBMS TP.HCM](https://apicms.ebms.vn/businfo/getallroute): 181 mục trong index, 334 chiều bus khả dụng và hai chiều Metro 1, 5.721 trạm/ga đủ điều kiện trong snapshot. Endpoint tìm hành trình nguồn trả rỗng lúc kiểm tra nên không dựa vào nó. Dijkstra tính trên đồ thị có hướng với trạng thái lên xe / đi bộ, tối đa ba lượt lên; không cho phép lên rồi xuống cùng trạm mà chưa đi qua một cạnh tuyến. Mục tiêu là hành trình với chi phí quãng đường, đi bộ và chuyển tuyến hợp lý, không phải tìm giờ đến sớm nhất.

Ga Văn Thánh có trạng thái “Chưa khai thác” trong API, dù danh sách lịch sử của thành phố có 14 ga. App không tự sửa bằng dữ liệu suy đoán hoặc khẳng định ga thực tế đang đóng; chỉ không đề xuất lên/xuống ở ga chưa được nguồn đánh dấu khả dụng. Số điểm dừng trong đồ thị có thể khác thực tế vì nguồn thiếu/chậm cập nhật. Tên trạm xuống và hướng tuyến là chỉ dẫn chính.

Đi bộ đầu/cuối chọn ứng viên trong 1 km đường chim bay; chuyển giữa trạm trong 240 m; tổng đi bộ sơ bộ tối đa 2,4 km. Các chặng chọn được đối chiếu lại với Valhalla: đầu/cuối tối đa 1,4 km cho mỗi chặng, chuyển trạm tối đa 650 m. Không có dữ liệu lịch vận hành, chờ xe, chuyến cuối hay gián đoạn tức thời. Không dựng giờ xe giả.

[Photon](https://github.com/komoot/photon) tìm địa điểm từ dữ liệu OSM. [OSM France usage policy](https://www.openstreetmap.fr/usage/) cho bản thử nghiệm công khai, miễn phí, lưu lượng nhỏ; giữ attribution OSM / HOT / OSM France và referrer chỉ origin cho tile. Không tải hàng loạt tile. Cache geocoding/route 24 giờ, lease MongoDB chia sẻ giữa các Vercel instance giới hạn upstream khoảng 1 request/giây. Không cần Maps API key hoặc billing mới. Snapshot transit được làm mới thủ công, cache importer tối đa 24 giờ; build không gọi hàng trăm request.

## An toàn dữ liệu

Camera User tiếp tục xử lý trên thiết bị. Maps chỉ gửi tên / tọa độ khi người dùng tra cứu; vị trí chỉ xin khi bấm nút. Không tự gắn nhãn căn phòng với GPS. Không chuyển Mongo URI hoặc quyền phòng sang provider bản đồ. Tooltip Leaflet dùng DOM `textContent`, tránh coi tên POI bên ngoài là HTML. Schema, same-origin, rate limit, timeout và hạn mức lưu video vẫn giữ. Các endpoint maps công khai chỉ trả dữ liệu bản đồ, không mở quyền đọc footage.

## Kiểm tra trước bàn giao

- TypeScript, production build và 26 unit tests: chất lượng ảnh, one-shot, mẫu âm, nhãn mơ hồ, từ chối semantic-only, chống nhảy nhãn yếu; transit có hướng, chuyển trạm, chặn lối đi không xác minh được, ngoài vùng và decode polyline.
- Browser viewport 320×568, 390×844, 768×1024, 1440×900: landing đúng hai nút, không tràn ngang. Ở viewport 390×844, camera chiếm khoảng 84% diện tích màn hình.
- Model thật + camera giả lập: một clip 5 giây / cảnh, 26 frame rõ giữ lại, chọn 8 frame. Lưu và học cảnh đầu khoảng 7,6 giây; User hiện tên sau khoảng 860 ms từ bật camera khi model sẵn sàng, suy luận 683 ms, 145 chi tiết khớp. 11 lượt cập nhật liên tiếp giữ đúng cùng nhãn. Hai cảnh sau zoom 1,04×, dịch 8/5 px, sáng 80% vẫn nhận đúng và đổi A→B→A; 74 / 33 inliers, khoảng 641–693 ms. Đây là kiểm tra tổng hợp, không phải accuracy căn phòng thật hay tốc độ điện thoại thật.
- Camera mờ trả `...`; cảnh kệ chưa học trả `...` sau khi chờ frame mới. Không giữ nhãn cũ để giả ổn định.
- Tìm “Chợ Bến Thành”, “Nhà hát Thành phố” trả lựa chọn địa điểm thật; đi bộ 819 m và xe máy khoảng 1,0 km ở cặp điểm đã chọn. Metro 1 trả đúng ga lên Bến Thành, hướng Bến xe Suối Tiên, xuống Nhà hát Thành phố, có đường đi bộ hai đầu. Giá trị chỉ đúng cho tọa độ được chọn trong phép thử.
- Browser đã nhận một hành trình hai bus có số 18 → 44, xuống/lên ở Trường CĐKT Cao Thắng, có đường đi bộ cuối. Đây là kiểm tra tính toán từ snapshot; không xác nhận xe đang chạy tại thời điểm người đọc mở app.

CI, production deployment và kiểm tra sau deploy được ghi nhận trong commit bàn giao. Chưa đo camera phần cứng của người dùng và chưa xác nhận từng tuyến ở thực địa.
