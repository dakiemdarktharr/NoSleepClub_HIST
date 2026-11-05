import type { Place } from '../maps/types';

export const TOUR_ID = 'central-architecture-v1';
export const REVIEWED_AT = '2026-11-05';
export type GuideLanguage = 'en' | 'vi';
type Copy = { name: string; subtitle: string; look: string; paragraphs: string[]; access: string };
export type TourSite = {
  id: string; landmarkId: string; point: { lat: number; lon: number }; address: string;
  image: string; photo: { author: string; year: string; url: string; license: string; licenseUrl: string };
  sources: { title: string; url: string }[]; en: Copy; vi: Copy;
};
export const TOUR_SITES: readonly TourSite[] = [
  {
    id: 'post-office', landmarkId: 'W39514793', point: { lat: 10.77969, lon: 106.69982 }, address: '2 Công xã Paris', image: '/guide/post-office.jpg',
    photo: { author: 'Balon Greyjoy', year: '2019', url: 'https://commons.wikimedia.org/wiki/File:20190923_Saigon_Central_Post_Office-1.jpg', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    sources: [{ title: 'Vietnam Post · Central Post Office', url: 'https://vnpost.vn/vi/hoat-dong-nganh/buu-dien-trung-tam-thanh-pho-ho-chi-minh-mot-diem-den-hap-dan' }, { title: 'Vietnam Post · Architecture and historic maps', url: 'https://vnpost.vn/vi/guong-dien-hinh-hoc-va-lam-theo-bac/buu-dien-tp-ho-chi-minh-lot-top-buu-dien-dep-nhat-the-gioi' }],
    en: { name: 'Central Post Office', subtitle: 'A city connected by letters', look: 'From the pavement, take in the central clock and the rhythm of the arched windows. You can stay outside for this stop.', paragraphs: ['Built between 1886 and 1891, the Central Post Office stands beside Notre Dame Cathedral. Vietnam Post identifies Villedieu and his assistant Foulhoux as its designers.', 'The building combines European classical architecture with Asian decorative details. Inside, historic maps recall the city and its communications networks. Our next stop is the neighbouring cathedral: two different public roles sharing one urban setting.'], access: 'Use the public pavement without blocking entrances. Interior access follows the operator’s current rules; this walk does not require entry.' },
    vi: { name: 'Bưu điện Trung tâm', subtitle: 'Thành phố nối nhau bằng những lá thư', look: 'Từ vỉa hè, nhìn đồng hồ giữa mặt tiền và nhịp các cửa vòm. Bạn có thể nghe toàn bộ chặng này ở bên ngoài.', paragraphs: ['Bưu điện Trung tâm được xây dựng từ năm 1886 đến 1891, nằm cạnh Nhà thờ Đức Bà. Vietnam Post ghi nhận kiến trúc sư Villedieu cùng phụ tá Foulhoux thiết kế công trình.', 'Tòa nhà kết hợp kiến trúc cổ điển châu Âu với chi tiết trang trí châu Á. Những bản đồ lịch sử bên trong gợi lại thành phố và mạng lưới liên lạc. Điểm tiếp theo là nhà thờ bên cạnh: hai công năng khác nhau cùng hiện diện trong một không gian đô thị.'], access: 'Đứng trên vỉa hè công cộng, không chắn lối vào. Việc vào bên trong theo quy định hiện tại của đơn vị quản lý; tuyến này không yêu cầu vào cửa.' },
  },
  {
    id: 'cathedral', landmarkId: 'N11774744262', point: { lat: 10.77930, lon: 106.69930 }, address: 'Công xã Paris', image: '/guide/cathedral.jpg',
    photo: { author: 'SfdWASINO', year: '2019', url: 'https://commons.wikimedia.org/wiki/File:Notre-Dame_Cathedral_Basilica_of_Saigon.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    sources: [{ title: 'Archdiocese of Saigon · Cathedral history', url: 'https://tgpsaigon.net/bai-viet/ngay-09-12-cung-hien-nha-tho-duc-ba-sai-gon-50510' }, { title: 'Archdiocese of Saigon · Restoration report', url: 'https://tgpsaigon.net/bai-viet/lap-dat-8-hang-trang-tri-dinh-mai-cua-so-tren-hai-thap-kem-nha-tho-duc-ba-sai-gon-89336' }],
    en: { name: 'Notre Dame Cathedral', subtitle: 'Reading a changing skyline', look: 'Observe the facade from a permitted public viewpoint. Scaffolding may hide details visible in the reference photograph; there is no need to find a particular feature.', paragraphs: ['Construction began in 1877 to J. Bourard’s design. The cathedral was inaugurated and consecrated on 11 April 1880. Its brick exterior and paired towers make it a recognisable part of the city’s skyline.', 'The Archdiocese describes a design combining Romanesque and Gothic elements. This remains a place of worship. Restoration has also changed its appearance; the Archdiocese’s 2026 report documents work on the towers. The historical photo is a reference, not a live view.'], access: 'Exterior observation only. Follow barriers, crossings and local signs. Interior access and a clear view of every detail are not promised.' },
    vi: { name: 'Nhà thờ Đức Bà', subtitle: 'Đọc một đường nét đang đổi thay', look: 'Quan sát mặt tiền từ vị trí công cộng được phép. Giàn giáo có thể che chi tiết trong ảnh tham chiếu; không cần tìm đúng một chi tiết mới đi tiếp.', paragraphs: ['Nhà thờ khởi công năm 1877 theo thiết kế của J. Bourard, được khánh thành và cung hiến ngày 11 tháng 4 năm 1880. Mặt ngoài bằng gạch và cặp tháp tạo nên dáng vẻ quen thuộc của công trình.', 'Tổng Giáo phận mô tả kiến trúc kết hợp yếu tố Romanesque và Gothic. Đây vẫn là nơi thực hành tôn giáo. Quá trình trùng tu cũng làm thay đổi cảnh quan; báo cáo năm 2026 của Tổng Giáo phận ghi nhận công việc trên các tháp. Ảnh lịch sử là tư liệu tham chiếu, không phải hình ảnh trực tiếp.'], access: 'Chỉ quan sát bên ngoài. Tuân thủ rào chắn, lối qua đường và biển báo. Không cam kết vào nội thất hoặc nhìn rõ mọi chi tiết.' },
  },
  {
    id: 'palace', landmarkId: 'W39598493', point: { lat: 10.77712, lon: 106.69684 }, address: 'Nam Kỳ Khởi Nghĩa · Lê Duẩn', image: '/guide/palace.jpg',
    photo: { author: 'Balon Greyjoy', year: '2019', url: 'https://commons.wikimedia.org/wiki/File:20190923_Independence_Palace-1.jpg', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    sources: [{ title: 'Independence Palace · Architecture', url: 'https://dinhdoclap.gov.vn/kien-truc-dinh-doc-lap/' }, { title: 'Independence Palace · History', url: 'https://dinhdoclap.gov.vn/lich-su-dinh-doc-lap/' }],
    en: { name: 'Independence Palace', subtitle: 'A different architectural chapter', look: 'From a permitted viewpoint by the main gate, notice the horizontal facade behind the grounds. The reference photo was taken closer to the building; a gate view may not match.', paragraphs: ['Architect Ngô Viết Thụ designed the present palace. Construction began on 1 July 1962 and the building was inaugurated on 31 October 1966. Its design combines modern architecture with East Asian traditions.', 'The site’s official history connects the palace with the events of 30 April 1975. Beside the earlier cathedral and post office, this twentieth-century building introduces another chapter in the city’s architecture and history. Our exterior walk ends here; an interior visit is a separate choice.'], access: 'Remain outside the grounds for this walk. Entry, tickets and visitor hours must be checked with the palace. Do not cross the road except at a permitted crossing.' },
    vi: { name: 'Dinh Độc Lập', subtitle: 'Một chương kiến trúc khác', look: 'Từ vị trí được phép gần cổng chính, quan sát những đường ngang của mặt tiền phía sau khuôn viên. Ảnh tham chiếu chụp gần tòa nhà hơn; góc ngoài cổng có thể không khớp.', paragraphs: ['Kiến trúc sư Ngô Viết Thụ thiết kế Dinh hiện nay. Công trình khởi công ngày 1 tháng 7 năm 1962 và khánh thành ngày 31 tháng 10 năm 1966, kết hợp kiến trúc hiện đại với tinh thần truyền thống Á Đông.', 'Lịch sử chính thức của di tích gắn Dinh với các sự kiện ngày 30 tháng 4 năm 1975. Bên cạnh nhà thờ và bưu điện có niên đại sớm hơn, công trình thế kỷ hai mươi mở ra một chương khác của kiến trúc và lịch sử thành phố. Tuyến quan sát bên ngoài kết thúc tại đây; tham quan nội thất là lựa chọn riêng.'], access: 'Tuyến này ở bên ngoài khuôn viên. Kiểm tra vé, giờ và điều kiện vào cửa với Dinh nếu muốn tham quan thêm. Chỉ qua đường tại nơi được phép.' },
  },
];
export const siteById = (id: string | null | undefined) => TOUR_SITES.find(site => site.id === id);
export function tourPlace(site: TourSite, language: GuideLanguage): Place {
  // Exterior waypoints differ deliberately from building centres used by 3D models.
  return { id: 'tour:' + site.id, name: site[language].name, address: site.address, ...site.point };
}
export function roomSite(label: string | null, clips: { label: string; siteId?: string; background: boolean; kind: string; status: string }[]) {
  if (!label) return undefined;
  const key = (s: string) => s.trim().normalize('NFC').toLocaleLowerCase('vi');
  const matches = clips.filter(clip => !clip.background && clip.kind === 'reference' && clip.status === 'ready' && key(clip.label) === key(label));
  const ids = new Set(matches.map(clip => clip.siteId));
  return ids.size === 1 ? siteById([...ids][0]) : undefined;
}
