import { LOCALES, type Locale } from '../i18n/catalog';
import type { Place } from './types';
// OSM records resolved through Photon on 2026-10-28. Names are editorial translations,
// coordinates are map features (not guarantees of an open entrance).
type Landmark = { id: string; local: string; names: readonly [string,string,string,string,string,string]; lat: number; lon: number; note?: 'excursion' | 'exterior' };
export const LANDMARKS: readonly Landmark[] = [
  { id:'W39598493', local:'Dinh Độc Lập', names:['Independence Palace','통일궁','独立宫','統一会堂','Дворец Независимости', "Dinh Độc Lập"], lat:10.7770348, lon:106.695488 },
  { id:'N5922616581', local:'Địa đạo Củ Chi · Bến Dược', names:['Cu Chi Tunnels · Bến Dược','꾸찌 터널 · Bến Dược','古芝地道 · Bến Dược','クチトンネル · Bến Dược','Туннели Кути · Bến Dược', "Địa đạo Củ Chi · Bến Dược"], lat:11.1428861, lon:106.4630985, note:'excursion' },
  { id:'N3812282642', local:'Đài Kỷ Niệm Thích Quảng Đức', names:['Thich Quang Duc Memorial','틱꽝득 기념비','释广德纪念碑','ティック・クアン・ドック記念碑','Мемориал Тхить Куанг Дыка', "Đài tưởng niệm Thích Quảng Đức"], lat:10.774988, lon:106.6866162 },
  { id:'W808033616', local:'Bến Nhà Rồng', names:['Nha Rong Wharf','냐롱 부두','龙屋码头','ニャロン埠頭','Причал Няронг', "Bến Nhà Rồng"], lat:10.7682843, lon:106.7066437 },
  { id:'W186249226', local:'Bảo tàng Chứng tích Chiến tranh', names:['War Remnants Museum','전쟁박물관','战争遗迹博物馆','戦争証跡博物館','Музей последствий войны', "Bảo tàng Chứng tích Chiến tranh"], lat:10.7793647, lon:106.6922806 },
  { id:'W802105071', local:'Bảo tàng TP. Hồ Chí Minh · 65 Lý Tự Trọng', names:['Ho Chi Minh City Museum','호찌민시 박물관','胡志明市博物馆','ホーチミン市博物館','Музей города Хошимина', "Bảo tàng TP. Hồ Chí Minh"], lat:10.7759106, lon:106.6996214 },
  { id:'W1497050780', local:'Chùa Bà Thiên Hậu · Hội quán Tuệ Thành', names:['Thien Hau Temple · Cholon','티엔허우 사원 · 쩌런','天后宫 · 堤岸','ティエンハウ廟 · チョロン','Храм Тхиенхау · Шолон', "Chùa Bà Thiên Hậu · Chợ Lớn"], lat:10.7535637, lon:106.661192 },
  { id:'N11774744262', local:'Nhà thờ Đức Bà', names:['Notre Dame Cathedral','노트르담 대성당','圣母大教堂','サイゴン大教会','Собор Нотр-Дам', "Nhà thờ Đức Bà"], lat:10.7792374, lon:106.6991514, note:'exterior' },
  { id:'W39514793', local:'Bưu điện Trung tâm', names:['Central Post Office','중앙우체국','中央邮局','中央郵便局','Центральный почтамт', "Bưu điện Trung tâm"], lat:10.7799557, lon:106.6999921 },
  { id:'W39514795', local:'Chợ Bến Thành', names:['Ben Thanh Market','벤탄 시장','滨城市场','ベンタイン市場','Рынок Бентхань', "Chợ Bến Thành"], lat:10.7725301, lon:106.6980365 },
];
export function landmarkPlace(item: Landmark, locale: Locale): Place {
  return { id: item.id, name: item.names[LOCALES.indexOf(locale)], address: item.local, lat: item.lat, lon: item.lon };
}
export const landmarkSource = (id: string) => `https://www.openstreetmap.org/${id[0] === 'W' ? 'way' : 'node'}/${id.slice(1)}`;
