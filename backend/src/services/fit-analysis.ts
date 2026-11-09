export type FitStatus = 'good' | 'loose' | 'oversized' | 'stretching' | 'too_small';

export interface GarmentMeasurements {
  chest: number;
  waist: number;
  hips: number;
  shoulders: number;
  sleeveLength: number;
  torsoLength: number;
}

export interface FitInput {
  body: GarmentMeasurements;
  garment: GarmentMeasurements;
  stretch: { horizontalPct: number; verticalPct: number };
}

const dimensions: Array<{ key: keyof GarmentMeasurements; label: string; axis: 'horizontal' | 'vertical'; easePct: number; lengthEaseCm: number }> = [
  { key: 'chest', label: 'Грудь', axis: 'horizontal', easePct: 5, lengthEaseCm: 0 },
  { key: 'waist', label: 'Талия', axis: 'horizontal', easePct: 3, lengthEaseCm: 0 },
  { key: 'hips', label: 'Бёдра', axis: 'horizontal', easePct: 5, lengthEaseCm: 0 },
  { key: 'shoulders', label: 'Плечи', axis: 'horizontal', easePct: 2, lengthEaseCm: 0 },
  { key: 'sleeveLength', label: 'Длина рукава', axis: 'vertical', easePct: 0, lengthEaseCm: 1 },
  { key: 'torsoLength', label: 'Длина изделия', axis: 'vertical', easePct: 0, lengthEaseCm: 1 }
];

export function analyzeGarmentFit(input: FitInput) {
  const checks = dimensions.map(({ key, label, axis, easePct, lengthEaseCm }) => {
    const bodyCm = input.body[key];
    const garmentCm = input.garment[key];
    const stretchLimitPct = axis === 'horizontal' ? input.stretch.horizontalPct : input.stretch.verticalPct;
    const requiredStretchPct = Math.max(0, ((bodyCm - garmentCm) / garmentCm) * 100);
    const surplusPct = Math.max(0, ((garmentCm - bodyCm) / bodyCm) * 100);
    const recommendedMinimumCm = bodyCm * (1 + easePct / 100) + lengthEaseCm;
    let status: FitStatus = 'good';
    if (surplusPct >= 12) status = 'oversized';
    else if (surplusPct >= 5) status = 'loose';
    else if (requiredStretchPct > 0 && requiredStretchPct <= stretchLimitPct) status = 'stretching';
    else if (requiredStretchPct > stretchLimitPct) status = 'too_small';

    return {
      key, label, status,
      bodyCm: Number(bodyCm.toFixed(1)),
      garmentCm: Number(garmentCm.toFixed(1)),
      requiredStretchPct: Number(requiredStretchPct.toFixed(1)),
      materialStretchLimitPct: Number(stretchLimitPct.toFixed(1)),
      surplusPct: Number(surplusPct.toFixed(1)),
      recommendedMinimumCm: status === 'too_small' ? Number(recommendedMinimumCm.toFixed(1)) : null
    };
  });

  const statuses = checks.map((item) => item.status);
  const overall: FitStatus = statuses.includes('too_small') ? 'too_small'
    : statuses.includes('stretching') ? 'stretching'
    : statuses.includes('oversized') ? 'oversized'
    : statuses.includes('loose') ? 'loose' : 'good';
  const tooSmall = checks.filter((item) => item.status === 'too_small');
  const recommendedSizeIncreasePct = tooSmall.length
    ? Math.max(...tooSmall.map((item) => Math.max(0, (item.recommendedMinimumCm! / item.garmentCm - 1) * 100)))
    : null;

  const message = overall === 'too_small'
    ? 'Размер слишком мал: материал не может безопасно компенсировать недостающий объём. Выберите больший размер.'
    : overall === 'stretching'
      ? 'Изделие растянется в пределах заданных характеристик материала. Это будет плотная посадка.'
      : overall === 'oversized'
        ? 'Изделие заметно больше параметров тела и будет выглядеть свободным/оверсайз.'
        : overall === 'loose'
          ? 'Посадка свободная, без необходимости растягивать материал.'
          : 'По указанным меркам размер подходит.';

  return {
    engine: 'vizo-fit-estimator-v1',
    overall,
    message,
    checks,
    recommendedSizeIncreasePct: recommendedSizeIncreasePct === null ? null : Number(recommendedSizeIncreasePct.toFixed(1)),
    limitations: [
      'Результат рассчитывается по меркам, извлечённым из 3D-моделей или введённым пользователем; этот endpoint сам не извлекает геометрию из GLB.',
      'Проценты растяжимости должны быть измерены для конкретной ткани. Состав ткани сам по себе не гарантирует точную растяжимость.',
      'Это оценка размерной посадки, а не физическая симуляция складок, швов, трения и разрыва ткани.'
    ]
  };
}
