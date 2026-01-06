import { ACTIVITY_LEVELS, GENDERS } from "@/types/user";

// Calcul du BMR (Basal Metabolic Rate)
export function calculateBMR(weight: number, height: number, age: number, gender: (typeof GENDERS)[number]) {
    if (!weight || !height || !age || gender === "unspecified") return null;

    // Mifflin-St Jeor Equation
    let bmr = 10 * weight + 6.25 * height - 5 * age;

    if (gender === "male") {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    return bmr;
}

export const ACTIVITY_FACTORS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

// Calcul du TDEE (Total Daily Energy Expenditure)
export function calculateTDEE(bmr: number, activityLevel: (typeof ACTIVITY_LEVELS)[number]) {
    if (!bmr || !activityLevel) return null;

    const factor = ACTIVITY_FACTORS[activityLevel];
    return Math.round(bmr * factor);
}

// Calcul des calories pour une perte légère (10% de déficit)
export const deficitCalories = (tdee: number) => Math.round(tdee * 0.9);

// Calcul des calories pour une gain légère (10% de surplus)
export const surplusCalories = (tdee: number) => Math.round(tdee * 1.1);