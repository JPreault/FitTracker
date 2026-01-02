export const GENDERS = ["male", "female", "unspecified"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;

export interface User {
    height: number | null;
    weight: number | null;
    age: number | null;
    gender: (typeof GENDERS)[number];
    activityLevel: (typeof ACTIVITY_LEVELS)[number];
    customStrideLength: number | null;
}
