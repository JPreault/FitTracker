"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/user-store";
import { AlertTriangle, ArrowRight, Flame, Info, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

const ACTIVITY_FACTORS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

const ACTIVITY_LABELS = {
    sedentary: "Sédentaire",
    light: "Léger",
    moderate: "Modéré",
    active: "Actif",
    very_active: "Très actif",
};

export default function CaloriesPage() {
    const { height, weight, age, gender, activityLevel } = useUserStore();

    // --- LOGIC ---

    const calculateBMR = () => {
        if (!weight || !height || !age || gender === "unspecified") return null;

        // Mifflin-St Jeor Equation
        let bmr = 10 * weight + 6.25 * height - 5 * age;

        if (gender === "male") {
            bmr += 5;
        } else {
            bmr -= 161;
        }

        return bmr;
    };

    const bmr = calculateBMR();
    let tdee: number | null = null;
    let warning: string | null = null;

    if (bmr && activityLevel) {
        const factor = ACTIVITY_FACTORS[activityLevel];
        tdee = Math.round(bmr * factor);

        if (tdee < 1200) {
            warning = "Attention : Ce résultat est très bas (< 1200 kcal). Consultez un professionnel.";
        } else if (tdee > 5000) {
            warning = "Attention : Ce résultat est très élevé (> 5000 kcal). Vérifiez vos données.";
        }
    }

    const missingFields = [];
    if (!height) missingFields.push("Taille");
    if (!weight) missingFields.push("Poids");
    if (!age) missingFields.push("Âge");
    if (gender === "unspecified") missingFields.push("Sexe");

    const hasMissingData = missingFields.length > 0;

    // Goals (Light Deficit / Surplus = +/- 10%)
    const deficitCalories = tdee ? Math.round(tdee * 0.9) : null;
    const surplusCalories = tdee ? Math.round(tdee * 1.1) : null;

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Maintien Calorique (TDEE)</h1>
                <p className="text-muted-foreground">Estimation de vos besoins énergétiques quotidiens selon la formule Mifflin-St Jeor.</p>
            </div>

            {hasMissingData ? (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Données manquantes
                        </CardTitle>
                        <CardDescription>Pour calculer votre métabolisme, nous avons besoin de votre profil complet.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm">
                            Champs manquants : <span className="font-medium">{missingFields.join(", ")}</span>
                        </div>
                        <Button asChild>
                            <Link href="/profile">
                                Compléter mon profil <ArrowRight className="ml-2 size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Main Result: Maintenance */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Maintenance */}
                        <Card className="md:col-span-2 lg:col-span-1 border-primary/20 bg-primary/5 shadow-md relative overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-primary flex items-center gap-2">
                                    <Flame className="size-5" />
                                    Maintien
                                </CardTitle>
                                <CardDescription>Ne pas changer de poids</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold tracking-tighter text-foreground">
                                    {tdee?.toLocaleString("fr-FR")} <span className="text-lg font-normal text-muted-foreground">kcal/j</span>
                                </div>
                                <div className="mt-4 text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
                                    Basé sur une activité <strong>{ACTIVITY_LABELS[activityLevel]}</strong> (x{ACTIVITY_FACTORS[activityLevel]})
                                </div>
                            </CardContent>
                        </Card>

                        {/* Deficit */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <TrendingDown className="size-5" />
                                    Perte légère
                                </CardTitle>
                                <CardDescription>Déficit modéré (-10%)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold tracking-tighter">
                                    {deficitCalories?.toLocaleString("fr-FR")}{" "}
                                    <span className="text-base font-normal text-muted-foreground">kcal/j</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Surplus */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
                                    <TrendingUp className="size-5" />
                                    Prise légère
                                </CardTitle>
                                <CardDescription>Surplus modéré (+10%)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold tracking-tighter">
                                    {surplusCalories?.toLocaleString("fr-FR")}{" "}
                                    <span className="text-base font-normal text-muted-foreground">kcal/j</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Warnings and Details */}
                    {warning && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Attention</AlertTitle>
                            <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-6">
                        <Separator />

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Summary of Input Data */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Info className="size-4" />
                                    Données utilisées
                                </h3>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <dt className="text-muted-foreground">Sexe</dt>
                                    <dd className="font-medium text-right">{gender === "male" ? "Homme" : "Femme"}</dd>

                                    <dt className="text-muted-foreground">Âge</dt>
                                    <dd className="font-medium text-right">{age} ans</dd>

                                    <dt className="text-muted-foreground">Poids</dt>
                                    <dd className="font-medium text-right">{weight} kg</dd>

                                    <dt className="text-muted-foreground">Taille</dt>
                                    <dd className="font-medium text-right">{height} cm</dd>

                                    <dt className="text-muted-foreground">Métabolisme de base (BMR)</dt>
                                    <dd className="font-medium text-right">{bmr ? Math.round(bmr) : "-"} kcal</dd>
                                </dl>
                            </div>

                            {/* Disclaimer */}
                            <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground space-y-2">
                                <p>
                                    <strong>Modèle utilisé :</strong> Mifflin-St Jeor. C&apos;est l&apos;une des formules les plus fiables pour
                                    estimer le métabolisme de base.
                                </p>
                                <p className="text-xs">
                                    Ces résultats sont des estimations. Pour une perte ou prise de poids contrôlée, ajustez votre apport en fonction
                                    de l&apos;évolution réelle de votre poids sur plusieurs semaines.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
