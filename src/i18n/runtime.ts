import { LOCALES, type Locale } from './catalog';
type Row = readonly [string, string, string, string, string];
const messages: [string[], Row][] = [
  [['Chọn vai trò để bắt đầu phiên test.'], ['Choose a role to begin.', '시작할 역할을 선택하세요.', '选择身份以开始。', '役割を選んで開始してください。', 'Выберите роль для начала.']],
  [['Chờ camera và mẫu tham chiếu'], ['Waiting for camera and references', '카메라와 참조 영상 대기 중', '等待相机和参考样本', 'カメラと参照データを待機中', 'Ожидание камеры и образцов']],
  [['Camera chưa bật','Camera đã tắt'], ['Camera off', '카메라 꺼짐', '相机已关闭', 'カメラはオフです', 'Камера выключена']],
  [['Camera trực tiếp'], ['Live camera', '실시간 카메라', '实时相机', 'ライブカメラ', 'Камера в реальном времени']],
  [['Bộ nhận diện đã sẵn sàng.','Bộ mẫu đã học và sẵn sàng nhận diện.'], ['Recognition is ready.', '인식 준비가 완료되었습니다.', '识别已就绪。', '認識の準備ができました。', 'Распознавание готово.']],
  [['Đang huấn luyện bộ phân loại từ footage đã lưu…','Đang chuẩn bị bộ mẫu đã học…','Đang chuẩn bị nhận diện…','Đang chuẩn bị bộ nhận diện…'], ['Preparing recognition…', '인식 준비 중…', '正在准备识别…', '認識を準備中…', 'Подготовка распознавания…']],
  [['Phòng test mới đã sẵn sàng. Quay từng khu vực rồi đặt tên.','Quay một video 5 giây để dạy khu vực đầu tiên.','Quay một video 5 giây để dạy khu vực.','Quay 5 giây, rồi đặt tên khu vực.'], ['Record a place for five seconds, then name it.', '장소를 5초 촬영한 뒤 이름을 지정하세요.', '拍摄地点五秒，然后命名。', '場所を5秒間撮影して名前を付けてください。', 'Снимите место в течение пяти секунд и назовите его.']],
  [['Mở QR phòng để nạp bộ mẫu.','Phòng chưa có mẫu. Vào Dev để quay footage trước.','Phòng chưa có mẫu đã học'], ['No references yet. Open the room QR or record in Dev.', '참조 영상이 없습니다. 방 QR을 열거나 개발자 모드에서 촬영하세요.', '尚无参考样本。打开房间二维码或在开发模式中拍摄。', '参照データがありません。ルームQRを開くか開発者モードで撮影してください。', 'Образцов пока нет. Откройте QR комнаты или запишите видео в режиме разработчика.']],
  [['Đã nạp bộ phân loại đã học. Hướng camera vào khu vực đã quay.'], ['Point the camera at a recorded place.', '촬영한 장소를 카메라로 비추세요.', '将相机对准已拍摄的地点。', '撮影済みの場所にカメラを向けてください。', 'Направьте камеру на записанное место.']],
  [['Chờ camera hiện hình rồi thử lại.'], ['Wait for the camera image, then try again.', '카메라 영상이 나온 후 다시 시도하세요.', '等待相机画面出现后重试。', '映像が表示されてから再試行してください。', 'Дождитесь изображения с камеры и повторите.']],
  [['Camera cần HTTPS và trình duyệt hỗ trợ. Hãy mở link Vercel bằng Safari hoặc Chrome.','Trình duyệt chưa hỗ trợ quay video. Hãy cập nhật Chrome hoặc Safari.','Không tìm thấy định dạng quay được trên thiết bị này.'], ['Use an updated Chrome or Safari browser over HTTPS.', 'HTTPS에서 최신 Chrome 또는 Safari를 사용하세요.', '请通过HTTPS使用最新Chrome或Safari。', 'HTTPSで最新版のChromeまたはSafariを使用してください。', 'Используйте обновлённый Chrome или Safari через HTTPS.']],
  [['Chưa được cấp quyền camera. Mở quyền Camera của trang rồi thử lại.'], ['Allow camera access in site settings, then try again.', '사이트 설정에서 카메라 권한을 허용한 뒤 다시 시도하세요.', '请在网站设置中允许相机访问后重试。', 'サイト設定でカメラを許可して再試行してください。', 'Разрешите доступ к камере в настройках сайта и повторите.']],
  [['Camera đang được app khác sử dụng. Đóng app đó rồi thử lại.'], ['Another app is using the camera. Close it and retry.', '다른 앱이 카메라를 사용 중입니다. 닫은 후 다시 시도하세요.', '其他应用正在使用相机，请关闭后重试。', '別のアプリがカメラを使用中です。閉じて再試行してください。', 'Камера занята другим приложением. Закройте его и повторите.']],
  [['Đang chờ khung hình xác nhận mới','Đang xác nhận thêm một frame'], ['Confirming the next frame', '다음 프레임 확인 중', '正在确认下一帧', '次のフレームを確認中', 'Проверка следующего кадра']],
  [['Thiếu sáng'], ['Too dark', '너무 어두움', '光线太暗', '暗すぎます', 'Слишком темно']],
  [['Quá sáng'], ['Too bright', '너무 밝음', '光线太亮', '明るすぎます', 'Слишком светло']],
  [['Ảnh mờ hoặc quá ít chi tiết'], ['Blurred or too little detail', '흐리거나 세부 정보 부족', '模糊或细节不足', 'ぼけ、または特徴が不足', 'Размыто или мало деталей']],
  [['Ảnh rõ'], ['Clear frame', '선명한 프레임', '清晰画面', '鮮明なフレーム', 'Чёткий кадр']],
  [['Chưa đủ chi tiết khớp với mẫu'], ['Not enough matching detail', '일치하는 세부 정보 부족', '匹配细节不足', '一致する特徴が不足', 'Недостаточно совпавших деталей']],
  [['Khung cảnh khác khu vực đã học','Đây là khung cảnh khác'], ['Unfamiliar scene', '학습하지 않은 장면', '未知场景', '未登録の風景', 'Незнакомая сцена']],
  [['Hai khu vực còn quá giống nhau'], ['Two places look too similar', '두 장소가 너무 비슷함', '两个地点过于相似', '2つの場所が似すぎています', 'Два места слишком похожи']],
  [['Đã xác minh chi tiết của khu vực'], ['Visual details verified', '시각적 특징 확인됨', '已验证视觉细节', '視覚的特徴を確認済み', 'Визуальные детали подтверждены']],
  [['Đã dừng quay. Đặt tên khu vực để lưu footage.'], ['Recording stopped. Name this place to save it.', '촬영을 마쳤습니다. 저장할 장소 이름을 지정하세요.', '拍摄已停止，请命名后保存。', '撮影が終了しました。場所に名前を付けて保存してください。', 'Запись завершена. Назовите место для сохранения.']],
  [['Quay video bị gián đoạn. Hãy kiểm tra video trước khi lưu.'], ['Recording was interrupted. Check the video before saving.', '촬영이 중단되었습니다. 저장 전에 영상을 확인하세요.', '拍摄中断，请在保存前检查视频。', '撮影が中断されました。保存前に動画を確認してください。', 'Запись прервалась. Проверьте видео перед сохранением.']],
  [['Video vượt 24 MB của bản test. Tải video về để giữ lại, rồi quay đoạn ngắn hơn.'], ['Video exceeds the 24 MB test limit. Download it, then record a shorter clip.', '영상이 24MB 제한을 초과합니다. 다운로드한 뒤 더 짧게 촬영하세요.', '视频超过24MB测试限制，请下载后拍摄更短片段。', '動画が24MBの上限を超えています。保存してから短く撮り直してください。', 'Видео превышает лимит 24 МБ. Скачайте его и запишите более короткий ролик.']],
  [['Video chưa có frame rõ. Hãy giữ máy ổn định và quay lại 5 giây.','Không đọc được frame rõ từ video. Hãy quay lại nơi có ánh sáng tốt hơn.'], ['No clear frames. Hold steady and record again in good light.', '선명한 프레임이 없습니다. 밝은 곳에서 흔들림 없이 다시 촬영하세요.', '没有清晰画面，请在光线充足处保持稳定重新拍摄。', '鮮明なフレームがありません。明るい場所で固定して撮り直してください。', 'Нет чётких кадров. Держите камеру неподвижно и снимите при хорошем освещении.']],
  [['Đã xóa footage và các mẫu liên quan.'], ['Footage and its references deleted.', '영상과 참조 데이터를 삭제했습니다.', '已删除视频及其参考样本。', '動画と参照データを削除しました。', 'Видео и его образцы удалены.']],
  [['Đã chuẩn bị video gốc để tải xuống.'], ['Original video is ready to download.', '원본 영상을 다운로드할 수 있습니다.', '原始视频已准备好下载。', '元の動画をダウンロードできます。', 'Исходное видео готово к скачиванию.']],
  [['Đã kiểm thử. Footage kiểm thử không được đưa vào mẫu tham chiếu.'], ['Evaluation complete. Test footage stays separate from training.', '평가 완료. 검증 영상은 학습에 포함되지 않습니다.', '评估完成，测试视频未用于训练。', '評価完了。検証動画は学習に使用しません。', 'Проверка завершена. Тестовое видео не используется для обучения.']],
  [['Hãy dán link phòng được tạo bởi app này.'], ['Paste a room link created by this app.', '이 앱에서 만든 방 링크를 붙여 넣으세요.', '请粘贴本应用生成的房间链接。', 'このアプリで作成したルームリンクを貼り付けてください。', 'Вставьте ссылку комнаты, созданную этим приложением.']],
  [['Đã sao chép link.'], ['Link copied.', '링크를 복사했습니다.', '链接已复制。', 'リンクをコピーしました。', 'Ссылка скопирована.']],
  [['Không kết nối được máy chủ.','Chưa kết nối được kho dữ liệu. Hãy thử lại sau.'], ['Cannot connect to the server. Please retry.', '서버에 연결할 수 없습니다. 다시 시도하세요.', '无法连接服务器，请重试。', 'サーバーに接続できません。再試行してください。', 'Нет соединения с сервером. Повторите попытку.']],
  [['Không mở được bộ nhận diện trên thiết bị này. Hãy thử Chrome hoặc Safari phiên bản mới.','Không tải được bộ kiểm tra hình ảnh.','Bộ nhận diện chưa sẵn sàng.','Model trả đặc trưng không đúng phiên bản.'], ['Recognition could not start. Try an updated Chrome or Safari.', '인식을 시작할 수 없습니다. 최신 Chrome 또는 Safari를 사용하세요.', '无法启动识别，请使用最新Chrome或Safari。', '認識を開始できません。最新のChromeまたはSafariをお試しください。', 'Не удалось запустить распознавание. Обновите Chrome или Safari.']],
  [['Tải model quá lâu. Kiểm tra mạng và thử bật camera lại.','Xử lý ảnh quá lâu. Hãy thử lại trên Chrome hoặc Safari mới.'], ['Recognition timed out. Check your connection and restart the camera.', '인식 시간이 초과되었습니다. 연결을 확인하고 카메라를 다시 켜세요.', '识别超时，请检查网络并重启相机。', '認識がタイムアウトしました。接続を確認してカメラを再起動してください。', 'Время ожидания истекло. Проверьте сеть и перезапустите камеру.']],
  [['Đã đóng bộ nhận diện.','Đã đóng bản đồ.'], ['Session closed.', '세션이 종료되었습니다.', '会话已关闭。', 'セッションを終了しました。', 'Сеанс закрыт.']],
  [['Không trích được đặc trưng ảnh.','Không xử lý được hình ảnh.'], ['Could not process this frame. Please retry.', '이 프레임을 처리할 수 없습니다. 다시 시도하세요.', '无法处理此画面，请重试。', 'このフレームを処理できません。再試行してください。', 'Не удалось обработать кадр. Повторите попытку.']],
  [['Mã phòng không hợp lệ hoặc không có quyền thao tác.'], ['Room link is invalid or lacks permission.', '방 링크가 잘못되었거나 권한이 없습니다.', '房间链接无效或没有权限。', 'ルームリンクが無効、または権限がありません。', 'Ссылка комнаты недействительна или нет доступа.']],
  [['Không tìm thấy footage trong phòng này.','Không tìm thấy phần video.'], ['Video was not found in this room.', '이 방에서 영상을 찾을 수 없습니다.', '此房间中未找到视频。', 'このルームに動画がありません。', 'Видео в этой комнате не найдено.']],
  [['Bộ mẫu đã thay đổi. Hãy huấn luyện lại.','Bộ mẫu vừa thay đổi. Hãy huấn luyện lại.'], ['References changed. Retrain the classifier.', '참조 데이터가 변경되었습니다. 다시 학습하세요.', '参考样本已更改，请重新训练。', '参照データが変更されました。再学習してください。', 'Образцы изменились. Обучите классификатор заново.']],
  [['Mỗi phòng test tối đa 12 footage. Xóa footage cũ trước khi thêm.','Kho test đã đầy. Xóa footage không dùng trước khi thêm.','Phòng test đã đầy. Xóa footage cũ trước khi thêm.'], ['Test storage is full (up to 12 videos per room). Remove unused footage.', '테스트 저장 공간이 가득 찼습니다(방당 최대 12개). 불필요한 영상을 삭제하세요.', '测试存储已满（每房间最多12个视频），请删除不用的视频。', 'テスト保存容量が上限です（ルームごとに最大12本）。不要な動画を削除してください。', 'Хранилище заполнено (до 12 видео на комнату). Удалите ненужные записи.']],
  [['Đã tạo nhiều phòng test. Hãy dùng lại phòng hiện tại hoặc thử sau.','Bản test đã đạt giới hạn phòng.'], ['Room creation limit reached. Reuse your room or try later.', '방 생성 한도에 도달했습니다. 기존 방을 사용하거나 나중에 시도하세요.', '已达房间创建上限，请使用现有房间或稍后重试。', 'ルーム作成上限に達しました。既存ルームを使うか後でお試しください。', 'Достигнут лимит комнат. Используйте существующую или повторите позже.']],
  [['Footage chưa được tải lên đầy đủ. Hãy thử lưu lại.','Footage chưa sẵn sàng.'], ['Upload is incomplete. Try saving again.', '업로드가 완료되지 않았습니다. 다시 저장하세요.', '上传未完成，请重新保存。', 'アップロードが未完了です。再度保存してください。', 'Загрузка не завершена. Попробуйте сохранить снова.']],
  [['Bản đồ đang bận. Thử lại sau vài giây.','Đã dùng nhiều lượt bản đồ. Vui lòng thử lại sau.'], ['Map service is busy. Try again shortly.', '지도 서비스가 혼잡합니다. 잠시 후 다시 시도하세요.', '地图服务繁忙，请稍后重试。', '地図サービスが混雑しています。少し待って再試行してください。', 'Картографический сервис занят. Повторите чуть позже.']],
  [['Nhập tên địa điểm hoặc địa chỉ để tìm.'], ['Enter a place name, address or coordinates.', '장소 이름, 주소 또는 좌표를 입력하세요.', '请输入地点名称、地址或坐标。', '場所の名前、住所、座標を入力してください。', 'Введите название места, адрес или координаты.']],
  [['Bản đồ thử nghiệm hiện hỗ trợ khu vực TP.HCM.','Bản thử nghiệm hỗ trợ hành trình trong khu vực TP.HCM, tối đa 60 km giữa hai điểm.'], ['This test covers Ho Chi Minh City, up to 60 km between points.', '이 테스트는 호찌민시 내 두 지점 간 최대 60km를 지원합니다.', '本测试支持胡志明市内两点间不超过60公里的路线。', 'このテストはホーチミン市内の2点間、最大60kmに対応しています。', 'Тест охватывает Хошимин: до 60 км между точками.']],
  [['Đang tìm địa điểm…'], ['Searching places…', '장소 검색 중…', '正在搜索地点…', '場所を検索中…', 'Поиск мест…']],
  [['Chưa tìm thấy. Thêm tên đường, quận hoặc nhập tọa độ.','Chưa tìm được địa điểm. Thử nhập tên đường hoặc tọa độ.'], ['No place found. Add a street, district or coordinates.', '장소를 찾지 못했습니다. 도로명, 구 또는 좌표를 추가하세요.', '未找到地点，请添加街道、区名或坐标。', '場所が見つかりません。通り、地区名、座標を追加してください。', 'Место не найдено. Уточните улицу, район или координаты.']],
  [['Chưa kết nối được dịch vụ địa điểm. Thử lại hoặc nhập tọa độ.'], ['Place search is unavailable. Retry or place a map pin.', '장소 검색을 사용할 수 없습니다. 재시도하거나 지도에 핀을 지정하세요.', '地点搜索暂不可用，请重试或在地图上放置图钉。', '場所検索を利用できません。再試行するか地図にピンを置いてください。', 'Поиск мест недоступен. Повторите или поставьте метку на карте.']],
  [['Thiết bị chưa hỗ trợ vị trí. Hãy nhập điểm đi.','Chưa lấy được vị trí. Cấp quyền hoặc nhập điểm đi.'], ['Location unavailable. Allow permission or enter your origin.', '위치를 사용할 수 없습니다. 권한을 허용하거나 출발지를 입력하세요.', '无法获取位置，请授权或输入出发地。', '位置を取得できません。許可するか出発地を入力してください。', 'Геолокация недоступна. Разрешите доступ или введите отправление.']],
  [['Đang lấy vị trí…'], ['Finding your location…', '현재 위치 확인 중…', '正在获取位置…', '現在地を取得中…', 'Определение местоположения…']],
  [['Vị trí hiện tại ngoài khu vực TP.HCM. Bạn có thể nhập điểm đi.'], ['You are outside the covered area. Enter an origin in Ho Chi Minh City.', '지원 지역 밖입니다. 호찌민시 내 출발지를 입력하세요.', '当前位置不在覆盖区域，请输入胡志明市内的出发地。', '対応地域の外です。ホーチミン市内の出発地を入力してください。', 'Вы вне зоны покрытия. Укажите отправление в Хошимине.']],
  [['Vị trí của tôi'], ['My location', '내 위치', '我的位置', '現在地', 'Моё местоположение']],
  [['Hai điểm quá gần nhau. Hãy chọn lại nơi đến.'], ['The points are too close. Choose another destination.', '두 지점이 너무 가깝습니다. 다른 목적지를 선택하세요.', '两点距离太近，请选择其他目的地。', '2点が近すぎます。別の目的地を選んでください。', 'Точки слишком близко. Выберите другое назначение.']],
  [['Đang tìm đường ngắn nhất…'], ['Finding the shortest route…', '최단 경로 검색 중…', '正在查找最短路线…', '最短ルートを検索中…', 'Поиск кратчайшего маршрута…']],
  [['Đang tìm tuyến và trạm chuyển…'], ['Finding lines and transfers…', '노선 및 환승 검색 중…', '正在查找线路和换乘站…', '路線と乗り換えを検索中…', 'Поиск линий и пересадок…']],
  [['Không mở được bộ tìm tuyến. Hãy tải lại trang.','Tìm tuyến quá lâu. Vui lòng thử lại.','Chưa kết nối được bộ tìm đường. Vui lòng thử lại.','Chưa tải được dữ liệu tuyến. Vui lòng thử lại.'], ['Route service unavailable. Please retry.', '경로 서비스를 사용할 수 없습니다. 다시 시도하세요.', '路线服务暂不可用，请重试。', 'ルートサービスを利用できません。再試行してください。', 'Построение маршрута недоступно. Повторите попытку.']],
  [['Chưa tìm được đường phù hợp với phương tiện này. Hãy chọn lại điểm trên đường.'], ['No route for this mode. Place the points on accessible streets.', '이 교통수단의 경로가 없습니다. 접근 가능한 도로에 지점을 지정하세요.', '此方式暂无路线，请在可通行道路上选择起终点。', 'この移動手段のルートがありません。通行可能な道に地点を置いてください。', 'Маршрут для этого способа не найден. Выберите точки на доступных улицах.']],
  [['Chưa tìm thấy tuyến phù hợp trong dữ liệu hiện có: tối đa 2 lần chuyển, trạm cách mỗi đầu không quá 1 km.'], ['No route found in this dataset within the limits: at most 2 transfers, stops within 1 km of each endpoint.', '현재 데이터와 조건에서 경로를 찾지 못했습니다. 환승은 최대 2회이며, 출발지와 목적지에서 정류장까지 1km 이내가 대상입니다.', '当前数据和条件下未找到路线：最多换乘2次，起终点距站点不超过1公里。', '現在のデータと条件では経路が見つかりません。乗り換えは2回まで、出発地・目的地から停留所まで1km以内が対象です。', 'В текущих данных не найден маршрут с учётом ограничений: не более 2 пересадок и не более 1 км от каждой конечной точки до остановки.']],
  [['Chưa xác minh được lối đi bộ tới trạm. Hãy thử điểm đi/đến gần trạm hơn.'], ['Could not verify walking access. Choose points nearer the stops.', '정류장까지 도보 접근을 확인하지 못했습니다. 정류장에 더 가까운 지점을 선택하세요.', '无法确认步行到站路线，请选择更靠近站点的位置。', '停留所への徒歩経路を確認できません。停留所に近い地点を選んでください。', 'Пеший доступ не подтверждён. Выберите точки ближе к остановкам.']],
];
const lookup = new Map(messages.flatMap(([sources, row]) => sources.map(source => [source, row] as const)));
const dynamic: [RegExp, Row][] = [
  [/^Đang tải model: (\d+)%$/, ['Downloading model: $1%', '모델 다운로드: $1%', '模型下载：$1%', 'モデル取得：$1%', 'Загрузка модели: $1%']],
  [/^Đang học hình ảnh (\d+)\/(\d+)…?$/, ['Learning images $1/$2…', '이미지 학습 $1/$2…', '学习图像 $1/$2…', '画像を学習中 $1/$2…', 'Обучение по кадрам $1/$2…']],
  [/^Đang kiểm thử frame (\d+)…?$/, ['Evaluating frame $1…', '프레임 $1 평가 중…', '评估画面 $1…', 'フレーム $1 を評価中…', 'Проверка кадра $1…']],
  [/^Đang kiểm tra đường đi bộ (\d+)\/(\d+)…?$/, ['Checking walking access $1/$2…', '도보 경로 확인 $1/$2…', '检查步行路线 $1/$2…', '徒歩経路を確認中 $1/$2…', 'Проверка пешего доступа $1/$2…']],
  [/^Đã huấn luyện (\d+) khu vực\. Chuyển sang User để thử ngay\.$/, ['Learned $1 places. Open User to try.', '$1곳 학습 완료. 사용자 모드에서 확인하세요.', '已学习$1个地点，请进入用户模式测试。', '$1か所を学習しました。ユーザーモードでお試しください。', 'Обучено мест: $1. Откройте режим пользователя.']],
  [/^Đã huấn luyện lại (\d+) khu vực từ footage đã lưu\.$/, ['Retrained $1 places from saved footage.', '저장된 영상으로 $1곳을 다시 학습했습니다.', '已使用保存的视频重新学习$1个地点。', '保存済み動画から$1か所を再学習しました。', 'Повторно обучено мест из сохранённых видео: $1.']],
  [/^(?:Đang lưu video|Đang tải lên video|Đang tải video|Đang tải video gốc|Đang tải footage) (\d+)\/(\d+)…?$/, ['Transferring video $1/$2…', '영상 전송 $1/$2…', '传输视频 $1/$2…', '動画を転送中 $1/$2…', 'Передача видео $1/$2…']],
  [/^(?:Đang lưu frame|Đang tải frame|Đang lưu mẫu) (\d+)\/(\d+)…?$/, ['Saving frames $1/$2…', '프레임 저장 $1/$2…', '保存画面 $1/$2…', 'フレームを保存中 $1/$2…', 'Сохранение кадров $1/$2…']],
  [/^(\d+) frame kiểm thử riêng: (\d+) đúng, (\d+) nhầm, (\d+) chưa chắc\. Cảnh lạ bị nhận nhầm: (\d+)\..*$/, ['Held-out frames: $1. Correct: $2; wrong: $3; uncertain: $4. Unknown scenes accepted: $5. Applies only to this test set; frames from one clip are correlated.', '독립 검증 프레임: $1. 정답: $2, 오답: $3, 불확실: $4. 미지 장면 오인식: $5. 이 검증 데이터에만 해당하며 같은 영상의 프레임은 상관관계가 있습니다.', '独立测试画面：$1。正确：$2；错误：$3；不确定：$4。未知场景误识别：$5。仅适用于此测试集，同一视频的画面具有相关性。', '検証フレーム：$1。正解：$2、誤り：$3、不確実：$4。未知の風景の誤認識：$5。この検証データのみの結果で、同じ動画のフレームには相関があります。', 'Проверочных кадров: $1. Верно: $2; неверно: $3; неуверенно: $4. Принято незнакомых сцен: $5. Результат относится только к этому набору; кадры одного ролика взаимосвязаны.']],
];
const fallback: Row = ['The action could not be completed. Please retry.', '작업을 완료할 수 없습니다. 다시 시도하세요.', '无法完成操作，请重试。', '操作を完了できません。再試行してください。', 'Не удалось выполнить действие. Повторите попытку.'];
export function localizeMessage(text: string, locale: Locale): string {
  if (!text) return '';
  const index = LOCALES.indexOf(locale), direct = lookup.get(text);
  if (direct) return direct[index];
  for (const [pattern, row] of dynamic) if (pattern.test(text)) return text.replace(pattern, row[index]);
  const details = text.match(/^(\d+) chi tiết khớp(?: · (\d+) ms)?$/);
  if (details) return [
    `${details[1]} matching details`, `일치 특징 ${details[1]}개`, `${details[1]}个匹配细节`, `一致する特徴 ${details[1]}点`, `Совпавших деталей: ${details[1]}`,
  ][index] + (details[2] ? ` · ${details[2]} ms` : '');
  const latency = text.match(/^(.*) · (\d+) ms$/);
  if (latency) return localizeMessage(latency[1], locale) + ` · ${latency[2]} ms`;
  return fallback[index];
}
