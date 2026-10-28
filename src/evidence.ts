import type { Prediction } from './shared';
export interface MatchEvidence { label: string; background: boolean; score: number; inliers: number; fast: boolean }
export function decideEvidence(matches: MatchEvidence[]): Prediction {
  const sorted = [...matches].filter(item => item.score >= .60).sort((a, b) => b.inliers - a.inliers);
  const best = sorted[0], second = sorted[1]?.inliers || 0;
  const unknown = { label: null, similarity: best?.score || 0, inliers: best?.inliers || 0 };
  if (!best || best.inliers < 12) return { ...unknown, reason: 'Chưa đủ chi tiết khớp với mẫu' };
  if (best.background) return { ...unknown, reason: 'Khung cảnh khác khu vực đã học' };
  if (second > 0 && best.inliers < second * 1.35 + 3) return { ...unknown, reason: 'Hai khu vực còn quá giống nhau' };
  // Semantic similarity alone is never proof of being in the registered place.
  return { label: best.label, similarity: best.score, inliers: best.inliers, immediate: best.inliers >= 24 || (best.fast && best.inliers >= 12), reason: 'Đã xác minh chi tiết của khu vực' };
}
