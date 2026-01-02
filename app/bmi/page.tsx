"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/user-store";
import { Activity, AlertTriangle, ArrowRight, Info, Ruler, Weight } from "lucide-react";
import Link from "next/link";

interface BMICategory {
    label: string;
    color: string;
    range: string;
}

export default function BMIPage() {
    const { height, weight } = useUserStore();

    // --- LOGIC ---

    const calculateBMI = () => {
        if (!height || !weight) return null;

        const heightM = height / 100;
        const bmiValue = weight / (heightM * heightM);
        return parseFloat(bmiValue.toFixed(1));
    };

    const bmi = calculateBMI();

    const getCategory = (value: number): BMICategory => {
        if (value < 18.5) return { label: "Maigreur (Underweight)", color: "text-blue-500", range: "< 18.5" };
        if (value < 25) return { label: "Corpulence normale", color: "text-green-500", range: "18.5 - 24.9" };
        if (value < 30) return { label: "Surpoids (Overweight)", color: "text-yellow-500", range: "25.0 - 29.9" };
        return { label: "Obésité", color: "text-destructive", range: "≥ 30.0" };
    };

    const category = bmi ? getCategory(bmi) : null;
    let warning: string | null = null;

    if (bmi) {
        if (bmi < 15 || bmi > 50) {
            warning = "Valeur atypique détectée. Veuillez vérifier que votre poids et votre taille sont corrects.";
        }
    }

    const missingFields = [];
    if (!height) missingFields.push("Taille");
    if (!weight) missingFields.push("Poids");
    const hasMissingData = missingFields.length > 0;

    // Progress bar value (clamped between 0 and 100 for display, mapping 15-40 range roughly)
    const getProgressValue = (val: number) => {
        // Map 15 (min visible) to 0% and 40 (max visible) to 100% linear roughly
        const min = 15;
        const max = 40;
        const percent = ((val - min) / (max - min)) * 100;
        return Math.min(Math.max(percent, 0), 100);
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Calculateur IMC (BMI)</h1>
                <p className="text-muted-foreground">Indice de Masse Corporelle selon la classification de l&apos;OMS.</p>
            </div>

            {hasMissingData ? (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Données manquantes
                        </CardTitle>
                        <CardDescription>Nous avons besoin de votre taille et de votre poids pour ce calcul.</CardDescription>
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
                    {/* Main Result Card */}
                    <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
                        <CardHeader className="pb-4 bg-muted/40">
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="size-5 text-primary" />
                                Votre Résultat
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 text-center space-y-6">
                            <div className="space-y-2">
                                <div className="text-6xl font-black tracking-tighter text-foreground">{bmi}</div>
                                <div className={`text-xl font-semibold ${category?.color}`}>{category?.label}</div>
                                <p className="text-sm text-muted-foreground">Plage : {category?.range}</p>
                            </div>

                            {/* Visual Gauge */}
                            <div className="max-w-md mx-auto space-y-2 pt-4">
                                <Progress value={getProgressValue(bmi || 0)} className="h-4" />
                                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                                    <span>15</span>
                                    <span>18.5</span>
                                    <span>25</span>
                                    <span>30</span>
                                    <span>40</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Warnings */}
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
                            {/* Details */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Info className="size-4" />
                                    Données utilisées
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                        <div className="bg-primary/10 p-2 rounded-full text-primary">
                                            <Weight className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Poids</p>
                                            <p className="font-bold">{weight} kg</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                        <div className="bg-primary/10 p-2 rounded-full text-primary">
                                            <Ruler className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Taille</p>
                                            <p className="font-bold">{height} cm</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Disclaimer / Formula */}
                            <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground space-y-3">
                                <p>
                                    <strong>Formule :</strong> Poids (kg) / Taille (m)²
                                </p>
                                <p>
                                    Le BMI (IMC) est un indicateur simple de la corpulence. Il ne prend pas en compte la masse musculaire,
                                    l&apos;ossature ou la répartition des graisses.
                                </p>
                                <p className="text-xs italic border-t border-border/50 pt-2 mt-2">
                                    Ne remplace pas un diagnostic médical. Pour les athlètes ou femmes enceintes, cet indicateur est peu pertinent.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
