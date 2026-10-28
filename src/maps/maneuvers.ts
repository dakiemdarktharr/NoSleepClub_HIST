import { LOCALES, type Locale } from '../i18n/catalog';
import type { RoadRoute } from './types';
// Valhalla maneuver enum: https://valhalla.github.io/valhalla/api/route/api-reference/#trip-legs-and-maneuvers
// Localized from structured types, not by replacing words inside an upstream sentence.
const rows = {
  start:['Start','출발','出发','出発','Начните движение'], arrive:['Arrive at your destination','목적지 도착','到达目的地','目的地に到着','Прибытие к месту назначения'],
  continue:['Continue','계속 이동','继续前行','直進','Продолжайте движение'], right:['Turn right','우회전','右转','右折','Поверните направо'], left:['Turn left','좌회전','左转','左折','Поверните налево'],
  slightRight:['Bear right','완만한 우회전','稍向右转','右方向へ','Плавно направо'],slightLeft:['Bear left','완만한 좌회전','稍向左转','左方向へ','Плавно налево'],
  sharpRight:['Turn sharply right','크게 우회전','向右急转','鋭く右折','Резко направо'],sharpLeft:['Turn sharply left','크게 좌회전','向左急转','鋭く左折','Резко налево'],
  uturn:['Make a U-turn','유턴','掉头','Uターン','Развернитесь'],ramp:['Take the ramp','진입로 진입','驶入匝道','ランプへ','На съезд'],
  rampRight:['Take the ramp on the right','오른쪽 진입로 진입','驶入右侧匝道','右のランプへ','На съезд справа'],rampLeft:['Take the ramp on the left','왼쪽 진입로 진입','驶入左侧匝道','左のランプへ','На съезд слева'],
  exitRight:['Take the exit on the right','오른쪽 출구로 이동','从右侧出口驶出','右の出口へ','Съезд направо'],exitLeft:['Take the exit on the left','왼쪽 출구로 이동','从左侧出口驶出','左の出口へ','Съезд налево'],
  keepRight:['Keep right','오른쪽 유지','靠右行驶','右側を進む','Держитесь правее'],keepLeft:['Keep left','왼쪽 유지','靠左行驶','左側を進む','Держитесь левее'],
  merge:['Merge','합류','汇入道路','合流','Перестройтесь'],roundabout:['Enter the roundabout','회전교차로 진입','进入环岛','環状交差点に入る','Въезжайте на круг'],exitRoundabout:['Leave the roundabout','회전교차로에서 나가기','驶出环岛','環状交差点を出る','Съезжайте с круга'],
  ferry:['Board the ferry','페리 탑승','乘坐渡轮','フェリーに乗る','На паром'],ferryExit:['Leave the ferry','페리에서 내리기','离开渡轮','フェリーを降りる','С парома'],
  stairs:['Take the stairs','계단 이용','走楼梯','階段を使う','По лестнице'],elevator:['Take the elevator','엘리베이터 이용','乘电梯','エレベーターを使う','На лифте'],escalator:['Take the escalator','에스컬레이터 이용','乘扶梯','エスカレーターを使う','На эскалаторе'],
  enter:['Enter the building','건물에 들어가기','进入建筑','建物に入る','Войдите в здание'],leave:['Leave the building','건물에서 나가기','离开建筑','建物を出る','Выйдите из здания'],
} as const;
const typeKeys:Record<number,keyof typeof rows>={1:'start',2:'start',3:'start',4:'arrive',5:'arrive',6:'arrive',7:'continue',8:'continue',9:'slightRight',10:'right',11:'sharpRight',12:'uturn',13:'uturn',14:'sharpLeft',15:'left',16:'slightLeft',17:'ramp',18:'rampRight',19:'rampLeft',20:'exitRight',21:'exitLeft',22:'continue',23:'keepRight',24:'keepLeft',25:'merge',26:'roundabout',27:'exitRoundabout',28:'ferry',29:'ferryExit',36:'keepRight',37:'keepLeft',38:'elevator',39:'stairs',40:'escalator',41:'enter',42:'leave'};
export function maneuverText(item:RoadRoute['instructions'][number],locale:Locale):string {
  if(locale==='en')return item.text;
  const index=LOCALES.indexOf(locale),key=typeKeys[item.type??0]||'continue';
  const street=item.streets?.join(' / ');
  return rows[key][index]+(key==='roundabout'&&item.exit ? ` · ${['Exit','출구','出口','出口','Выезд'][index]} ${item.exit}`:'')+(street?` · ${street}`:'');
}
