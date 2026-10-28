export interface Place { id: string; name: string; address?: string; lat: number; lon: number }
export type TravelMode = 'walk' | 'motorbike' | 'transit';
export interface RoadRoute { coordinates: [number, number][]; meters: number; seconds: number; instructions: { text: string; meters: number; type?: number; streets?: string[]; exit?: number }[]; provider: string }
export interface TransitStop extends Place { kind: 'bus' | 'metro' }
export interface TransitLine { id: string; code: string; name: string; headsign: string; kind: 'bus' | 'metro'; stops: string[]; shape: [number, number][] }
export interface TransitNetwork { updatedAt: string; sources: { name: string; url: string }[]; stops: TransitStop[]; lines: TransitLine[] }
export interface JourneyLeg { kind: 'walk' | 'bus' | 'metro'; from: Place; to: Place; meters: number; coordinates: [number, number][]; line?: TransitLine; stopCount?: number; boardIndex?: number; alightIndex?: number }
export interface Journey { legs: JourneyLeg[]; meters: number; boardings: number; updatedAt: string }
