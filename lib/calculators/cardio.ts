export interface CardioZone {
    name: string;
    minBpm: number;
    maxBpm: number;
    description: string;
}

export type CardioResult = {
    hrMax: number;
    zones: CardioZone[];
    source: "estimated" | "measured";
};

/**
 * Estimates Max Heart Rate based on age.
 * Formula: 220 - age
 */
export function estimateMaxHr(age: number): number {
    return 220 - age;
}

/**
 * Calculates 5 intensity zones based on Max HR (Classic method).
 * Z1: 50-60%
 * Z2: 60-70%
 * Z3: 70-80%
 * Z4: 80-90%
 * Z5: 90-100%
 */
export function calculateZones(maxHr: number): CardioZone[] {
    const getZone = (name: string, minPct: number, maxPct: number, description: string): CardioZone => ({
        name,
        minBpm: Math.round(maxHr * minPct),
        maxBpm: Math.round(maxHr * maxPct),
        description,
    });

    return [
        getZone("Z1", 0.5, 0.6, "Échauffement / Récupération"),
        getZone("Z2", 0.6, 0.7, "Endurance fondamentale"),
        getZone("Z3", 0.7, 0.8, "Endurance active"),
        getZone("Z4", 0.8, 0.9, "Seuil anaérobie"),
        getZone("Z5", 0.9, 1.0, "Effort maximal"),
    ];
}
