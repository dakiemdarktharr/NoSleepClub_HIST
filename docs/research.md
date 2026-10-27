# Các hệ thống đã khảo sát và quyết định cho POC

Khảo sát ngày 28/10/2026. Đây là các hệ thống / công trình đại diện cho các thành phần được yêu cầu; không khẳng định bao phủ mọi sản phẩm đã tồn tại. Những kết quả benchmark của tác giả không phải kết quả của app này.

| Hệ thống / nguồn chính | Workflow và kiến trúc liên quan | Áp dụng vào HIST |
| --- | --- | --- |
| [Google Teachable Machine](https://teachablemachine.withgoogle.com/) | Thu mẫu theo nhãn, train, kiểm tra, export; có thể làm việc trên thiết bị. | Luồng Dev ghi mẫu rồi User thử; thao tác đơn giản. Không dùng softmax hai lớp làm bằng chứng cảnh lạ. |
| [AnyLoc](https://github.com/AnyLoc/AnyLoc), [bài báo](https://arxiv.org/abs/2308.00688) | Visual place recognition với đặc trưng foundation model, tổng hợp đặc trưng và truy hồi ảnh. | Dùng đặc trưng ảnh có sẵn và gallery theo footage. POC dùng DINOv2 CLS, không tuyên bố đã triển khai đầy đủ AnyLoc-VLAD. |
| [Hierarchical Localization](https://github.com/cvg/Hierarchical-Localization) | Truy hồi ảnh ứng viên, ghép local features, xác định camera pose với mô hình tham chiếu. | Quy trình hai tầng: truy hồi rồi kiểm tra hình học. POC không dựng SfM hoặc xuất pose 6DoF. |
| [LightGlue](https://github.com/cvg/LightGlue), [bài báo ICCV](https://openaccess.thecvf.com/content/ICCV2023/papers/Lindenberger_LightGlue_Local_Feature_Matching_at_Light_Speed_ICCV_2023_paper.pdf) | Learned local feature matching cho các cặp ảnh. | Hướng nâng cấp khi có môi trường tính toán / dữ liệu phù hợp. POC dùng ORB trên browser để giữ hạ tầng nhỏ. |
| [Niantic VPS2](https://nianticspatial.com/docs/nsdk/features/vps2/) | Kết hợp cảm biến, hình ảnh và dịch vụ đám mây; định vị chính xác theo site đã được lập bản đồ. | Phân biệt nhận diện khu vực và định vị chính xác. Không giả vờ footage đã đặt tên là bản đồ VPS. |
| [DINOv2](https://github.com/facebookresearch/dinov2), [ONNX model](https://huggingface.co/onnx-community/dinov2-small) | Bộ trích đặc trưng pretrained; bản ONNX dùng được với Transformers.js. | DINOv2 Small q8, revision `8b1f705a3a7f6f062f6bdd21986c1583d3ef105d`. Không train lại backbone. |
| [OpenCV feature matching + homography](https://docs.opencv.org/4.x/d7/dff/tutorial_feature_homography.html) | Lọc match theo ratio test rồi RANSAC xác minh tương ứng hình học. | Dùng ORB + Hamming, yêu cầu inlier và độ phủ không gian. Homography là phép kiểm tra cặp ảnh thực dụng, không chứng minh toàn cảnh 3D giống nhau. |

## Vì sao video đã đặt tên chưa đủ để “luôn biết đúng”

Tên là nhãn do Dev cung cấp, không phải dữ kiện thị giác mà model tự chứng minh. Nhiều frame trong cùng video có tương quan cao; hàng trăm frame gần trùng không thay thế góc nhìn, ánh sáng và lần quay mới. Một model hai lớp luôn chọn A hoặc B có thể tự tin với cảnh thứ ba. Vì vậy app không dùng “điểm cao nhất” làm điều kiện duy nhất.

Thiết kế được chọn:

1. Quay một khu vực mỗi footage. Sau khi dừng mới yêu cầu nhãn, loại tham chiếu / kiểm thử và cờ cảnh khác.
2. Quay 5 giây, giữ các frame rõ độc lập với thời gian suy luận. Chọn tối đa 8 frame rõ theo các khoảng thời gian rồi xử lý sau khi dừng; cảnh đứng yên vẫn hợp lệ. Bộ lọc không thể bảo đảm loại mọi ảnh motion blur; cần kiểm tra bằng thiết bị thật.
3. Fit bộ phân loại few-shot nhiều prototype từ đặc trưng DINOv2, lưu artifact trên MongoDB và cache thiết bị. So với các prototype / mẫu hỗ trợ bằng ngưỡng tuyệt đối và khoảng cách với nhãn cạnh tranh / cảnh khác.
4. Khớp rất mạnh có thể hiện tên từ frame đầu. Khớp yếu hơn cần một ảnh tham chiếu xác minh bằng ORB và RANSAC, với đủ inlier, tỷ lệ inlier và diện tích phủ. Không bắt hai ảnh tham chiếu cùng thấy một góc.
5. Bằng chứng vừa phải cần hai lượt xác nhận; bằng chứng mạnh có thể hiện ngay. Bằng chứng mới không đạt thì trả `...`; không giữ tên cũ vô hạn. Chi tiết bản sửa và giới hạn đo trong [audit-five-second.md](audit-five-second.md).
6. Đo trên footage kiểm thử chụp ở lượt khác, bao gồm cảnh lạ. Ngưỡng ban đầu không được coi là đã calibration cho mọi căn phòng.

## Hạ tầng web / điện thoại

Theo [Vercel Functions limits](https://vercel.com/docs/functions/limitations), payload Functions có giới hạn 4,5 MB. App dùng các request video 256 KiB và frame phân trang; không upload cả footage trong một request. MongoDB lưu video theo chunk và metadata trong project riêng.

[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) yêu cầu secure context và quyền camera. Production dùng HTTPS, `playsInline`, ưu tiên camera sau, không xin audio. Quay bằng MediaRecorder có kiểm tra định dạng hỗ trợ; việc chọn codec và hiệu năng còn phụ thuộc trình duyệt.

Không tồn tại bằng chứng từ việc deploy rằng model nhận đúng căn phòng thật. Cần thu dữ liệu và đo như [validation.md](validation.md) trước khi mô tả độ chính xác cho người dùng.
