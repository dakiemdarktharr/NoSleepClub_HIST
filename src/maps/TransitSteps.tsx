import { useLocale } from '../i18n';
import Icon from '../ui/Icon';
import { maneuverText } from './maneuvers';
import type { Journey, Place } from './types';
const metersText = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)} km` : `${Math.round(n)} m`;
export default function TransitSteps({ journey, displayPlace }: { journey: Journey; displayPlace: (point: Place) => Place }) {
  const { t, locale } = useLocale();
  return <ol className="transit-steps">{journey.legs.map((leg, index) => {
    const previousRide = journey.legs.slice(0, index).reverse().find(item => item.line);
    const nextRide = journey.legs.slice(index + 1).find(item => item.line);
    const lineName = (kind: string, code: string) => t(kind === 'metro' ? 'metroLine' : 'busLine', { code });
    return <li key={index} className={leg.kind === 'walk' ? 'walk-leg' : ''}>
      {leg.kind === 'walk' ? <>
        <h3>{t(previousRide && nextRide ? 'transferWalk' : 'walkDistance', { distance: metersText(leg.meters) })}</h3>
        <p>{t('fromPlace', { place: displayPlace(leg.from).name })}</p>
        {leg.from.address && <small>{leg.from.address}</small>}
        <p>{t('toPlace', { place: displayPlace(leg.to).name })}</p>
        {leg.to.address && <small>{leg.to.address}</small>}
        {nextRide && previousRide && <p>{t('thenBoard', { line: lineName(nextRide.kind, nextRide.line!.code) })}</p>}
        {!!leg.instructions?.length && <details className="transfer-directions"><summary>{t('walkingDirections')}</summary><ol className="road-instructions">{leg.instructions.map((step, i) => <li key={i}>{maneuverText(step, locale)}{step.meters > 0 && <small>{metersText(step.meters)}</small>}</li>)}</ol></details>}
      </> : <>
        {previousRide && <p className="transfer-label">{t(previousRide.to.id === leg.from.id ? 'sameStopTransfer' : 'changeLine')}</p>}
        <span className={`line-code ${leg.kind}`}><Icon name="transit" size={14}/>{lineName(leg.kind, leg.line!.code)}</span>
        <h3>{t('boardAt', { place: displayPlace(leg.from).name })}</h3>
        {leg.from.address && <small>{leg.from.address}</small>}
        <small>{t('towards', { place: leg.line!.headsign })}</small>
        <p>{t('alightAt', { place: displayPlace(leg.to).name })}</p>
        {leg.to.address && <small>{leg.to.address}</small>}
        <small>{t('rideEstimate', { n: Math.max(1, Math.round(leg.seconds / 60)), stops: leg.stopCount || 0 })}</small>
        <small>{t('waitEstimate', { n: Math.round((leg.waitSeconds || 0) / 60) })}</small>
        {leg.timingBasis === 'assumed' && <small>{t('assumedTiming')}</small>}
        {leg.line!.serviceHours && <small>{t('publishedHours', { hours: leg.line!.serviceHours })}</small>}
      </>}
    </li>;
  })}</ol>;
}
