import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeGarmentFit } from '../src/services/fit-analysis.js';

const body = { chest: 100, waist: 82, hips: 98, shoulders: 46, sleeveLength: 62, torsoLength: 68 };

test('large garment is reported as oversized rather than shrinking to the body', () => {
  const result = analyzeGarmentFit({
    body,
    garment: { chest: 125, waist: 105, hips: 120, shoulders: 52, sleeveLength: 66, torsoLength: 76 },
    stretch: { horizontalPct: 0, verticalPct: 0 }
  });
  assert.equal(result.overall, 'oversized');
  assert.equal(result.checks.find((item) => item.key === 'chest')?.status, 'oversized');
});

test('stretch fabric can accommodate a small measurement gap within its stated limit', () => {
  const result = analyzeGarmentFit({
    body,
    garment: { ...body, chest: 96, waist: 80, hips: 95 },
    stretch: { horizontalPct: 12, verticalPct: 0 }
  });
  assert.equal(result.overall, 'stretching');
  assert.equal(result.checks.find((item) => item.key === 'chest')?.status, 'stretching');
});

test('non-stretch fabric that is too small produces a larger-size recommendation', () => {
  const result = analyzeGarmentFit({
    body,
    garment: { ...body, chest: 84 },
    stretch: { horizontalPct: 0, verticalPct: 0 }
  });
  assert.equal(result.overall, 'too_small');
  assert.ok((result.checks.find((item) => item.key === 'chest')?.recommendedMinimumCm ?? 0) > 100);
  assert.ok((result.recommendedSizeIncreasePct ?? 0) > 0);
});
