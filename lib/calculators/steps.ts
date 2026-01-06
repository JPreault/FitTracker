export type StepsCalculationResult = {
    steps: number;
    effectiveStride: number;
    isEstmated: boolean;
};

export type CaloriesCalculationResult = {
    kcalTotal: number;
    kcalPerMin: number;
    speedMMin: number;
    speedKmh: number;
    durationMin: number;
    vo2: number;
};

export type CaloriesCalculationInput = {
    distanceMeters: number;
    weightKg: number;
    inclinePct?: number; // default 0
    durationMin?: number;
    speedKmh?: number;
};

/**
 * Calculates the number of steps based on distance and stride length.
 */
export function calculateSteps(distanceMeters: number, strideMeters: number): number {
    if (!distanceMeters || !strideMeters || strideMeters <= 0) return 0;
    return Math.round(distanceMeters / strideMeters);
}

/**
 * Calculates calories burned using the ACSM Walking Equation.
 * VO2 = 0.1 * S + 1.8 * S * G + 3.5
 * S = Speed in m/min
 * G = Grade (incline) as a fraction
 * VO2 in mL/kg/min
 */
export function calculateCaloriesAcswWalking({
    distanceMeters,
    weightKg,
    inclinePct = 0,
    durationMin,
    speedKmh,
}: CaloriesCalculationInput): CaloriesCalculationResult | null {
    if (!weightKg || distanceMeters <= 0) return null;

    // Need either duration or speed
    if (!durationMin && !speedKmh) return null;

    let S_m_min = 0;
    let D_min = 0;

    // Determine Speed (m/min) and Duration (min)
    if (speedKmh && speedKmh > 0) {
        S_m_min = (speedKmh * 1000) / 60;
        // Recalculate duration based on speed
        // time = distance / speed
        D_min = distanceMeters / S_m_min;
    } else if (durationMin && durationMin > 0) {
        D_min = durationMin;
        S_m_min = distanceMeters / durationMin;
    } else {
        return null;
    }

    const G_fraction = inclinePct / 100;

    // ACSM Walking Equation
    const vo2 = 0.1 * S_m_min + 1.8 * S_m_min * G_fraction + 3.5;

    // Convert to Kcal
    const kcalPerMin = (vo2 * weightKg) / 200;
    const kcalTotal = kcalPerMin * D_min;

    return {
        kcalTotal,
        kcalPerMin,
        speedMMin: S_m_min,
        speedKmh: (S_m_min * 60) / 1000,
        durationMin: D_min,
        vo2,
    };
}
