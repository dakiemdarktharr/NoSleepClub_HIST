import type { CSSProperties } from 'react';
import { useLocale } from '../i18n';
import { journeyPresentation } from './journeyPresentation';
import type { Journey, Place } from './types';
export const lineStyle = (color: string) => ({ '--route-color': color } as CSSProperties);
export default function TransferGuide({ journey, displayPlace }: { journey: Journey; displayPlace: (point: Place) => Place }) {
  const { t } = useLocale(), { transfers } = journeyPresentation(journey);
  if (!transfers.length) return null;
  return <div className="transfer-guide">{transfers.map(change => <section className="transfer-card" key={change.number} aria-label={t('transferNumber', { n: change.number })}>
    <h3>{t('transferNumber', { n: change.number })}</h3>
    <div className="transfer-stop" style={lineStyle(change.fromStyle.color)}><span className="line-code">{change.fromStyle.number} · {t(change.from.kind === 'metro' ? 'metroLine' : 'busLine', { code: change.from.line!.code })}</span><div><span>{t('alightLabel')}</span><strong>{displayPlace(change.from.to).name}</strong>{change.from.to.address && <small>{change.from.to.address}</small>}</div></div>
    <p className="transfer-connection">{change.sameStop ? t('sameStopTransfer') : change.walkMeters > 0 ? t('transferWalk', { distance: `${Math.round(change.walkMeters)} m` }) : t('toPlace', { place: displayPlace(change.to.from).name })}</p>
    <div className="transfer-stop" style={lineStyle(change.toStyle.color)}><span className="line-code">{change.toStyle.number} · {t(change.to.kind === 'metro' ? 'metroLine' : 'busLine', { code: change.to.line!.code })}</span><div><span>{t('boardLabel')}</span><strong>{displayPlace(change.to.from).name}</strong>{change.to.from.address && <small>{change.to.from.address}</small>}<small>{t('towards', { place: change.to.line!.headsign })}</small></div></div>
  </section>)}</div>;
}
