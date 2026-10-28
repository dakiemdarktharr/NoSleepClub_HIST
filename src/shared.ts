export const MODEL = 'dinov2-small-q8-orb-v1';
export const MAX_FRAMES = 80;
export const CLASSIFIER_VERSION = 'fewshot-dinov2-v3';
export const CAPTURE_SECONDS = 5;
export const CHUNK_SIZE = 256 * 1024;
export const MAX_VIDEO_BYTES = 24 * 1024 * 1024;
export type Mode = 'user' | 'dev';
export interface Room { id: string; readKey: string; writeKey?: string }
export interface Feature {
  t: number; embedding: number[]; points: [number, number][]; descriptors: string;
  width: number; height: number; sharpness: number; brightness: number;
}
export interface Footage {
  id: string; label: string; background: boolean; kind: 'reference' | 'validation';
  status: 'pending' | 'ready'; frameCount: number; duration: number; size: number;
  chunks: number; mime: string; cover: string; createdAt: string;
}
export interface CatalogFrame extends Feature { label: string; background: boolean; footageId: string }
export interface Prediction { label: string | null; reason: string; similarity: number; inliers: number; immediate?: boolean; latencyMs?: number }
export interface Quality { sharpness: number; brightness: number; accepted: boolean; reason: string }
export interface LearnedClass { label: string; background: boolean; prototypes: number[][]; threshold: number; fastThreshold: number; examples: number }
export interface TrainedClassifier { version: typeof CLASSIFIER_VERSION; featureModel: string; sourceIds: string[]; trainedAt: string; classes: LearnedClass[]; supports: CatalogFrame[] }
export interface CapturedFrame { image: ImageData; t: number; sharpness: number }
