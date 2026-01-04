"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateZones, CardioZone, estimateMaxHr } from "@/lib/calculators/cardio";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { Activity, AlertTriangle, HeartPulse, Info } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function CardioPage() {
    const { age } = useUserStore();

    const [measuredMaxHr, setMeasuredMaxHr] = useState<string>("");

    const { activeMaxHr, zones, source, error } = useMemo(() => {
        let activeMaxHr: number | null = null;
        let zones: CardioZone[] = [];
        let source: "estimated" | "measured" | null = null;
        let error: string | null = null;

        const measured = measuredMaxHr ? parseInt(measuredMaxHr) : null;

        // Priority to measured HR
        if (measured) {
            if (measured < 120 || measured > 230) {
                error = "La fréquence cardiaque doit être comprise entre 120 et 230 bpm.";
            }

            if (measured >= 30 && measured <= 250) {
                activeMaxHr = measured;
                source = "measured";
                zones = calculateZones(measured);
            }
        } else if (age) {
            // Fallback to age
            const estimated = estimateMaxHr(age);
            activeMaxHr = estimated;
            source = "estimated";
            zones = calculateZones(estimated);
        }

        return { activeMaxHr, zones, source, error };
    }, [age, measuredMaxHr]);

    const getZoneColor = (name: string) => {
        switch (name) {
            case "Z1":
                return "bg-slate-500";
            case "Z2":
                return "bg-emerald-500";
            case "Z3":
                return "bg-yellow-500";
            case "Z4":
                return "bg-orange-500";
            case "Z5":
                return "bg-red-500";
            default:
                return "bg-primary";
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Zones Cardio</h1>
                <p className="text-muted-foreground">Calculez vos zones d&apos;intensité cardiaque pour optimiser votre entraînement.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Input Section */}
                <Card className="md:col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 text-primary" />
                            Paramètres
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Votre Age (Profil)</Label>
                            {age ? (
                                <div className="text-2xl font-bold">{age} ans</div>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Info className="w-4 h-4" />
                                    <span>Non renseigné dans le profil</span>
                                    <Button variant="link" asChild className="p-0 h-auto">
                                        <Link href="/profile">Modifier</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="measuredHr">FC Max Mesurée (optionnel)</Label>
                            <Input
                                id="measuredHr"
                                type="number"
                                placeholder="Ex: 185"
                                value={measuredMaxHr}
                                onChange={(e) => setMeasuredMaxHr(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">Laissez vide pour estimer via l&apos;âge (220 - âge).</p>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 text-sm text-yellow-600 bg-yellow-50 rounded-md border border-yellow-200">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Summary / Header result */}
                <Card className="md:col-span-1 border-primary/20 bg-primary/5 flex flex-col justify-center items-center text-center p-6 shadow-sm">
                    {activeMaxHr ? (
                        <div className="space-y-2 animate-in zoom-in-50 duration-300">
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                                FC Max {source === "estimated" ? "(Estimée)" : "(Personnalisée)"}
                            </div>
                            <div className="text-5xl font-black text-primary tracking-tighter">
                                {activeMaxHr} <span className="text-xl font-medium text-muted-foreground">BPM</span>
                            </div>
                            {source === "estimated" && (
                                <div className="text-xs text-muted-foreground max-w-[200px] mx-auto">Basé sur la formule théorique (220 - âge).</div>
                            )}
                        </div>
                    ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                            <HeartPulse className="w-12 h-12 opacity-20" />
                            <p>En attente de données...</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Zones Display */}
            {zones.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-150">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <HeartPulse className="w-5 h-5 text-red-500" />
                        Zones d&apos;intensité
                    </h3>

                    <div className="grid gap-3">
                        {zones.map((zone, index) => (
                            <div
                                key={zone.name}
                                className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50"
                            >
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", getZoneColor(zone.name))} />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("font-bold border-0 text-white", getZoneColor(zone.name))}>
                                                {zone.name}
                                            </Badge>
                                            <span className="font-semibold text-lg">
                                                {zone.minBpm} - {zone.maxBpm} <span className="text-xs text-muted-foreground font-normal">BPM</span>
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{zone.description}</p>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                                            {index === 0 ? "50-60" : index === 1 ? "60-70" : index === 2 ? "70-80" : index === 3 ? "80-90" : "90-100"}
                                            % FC max
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground leading-relaxed">
                        <strong>Disclaimer :</strong> Ces zones sont des estimations basées sur des modèles généraux. La fréquence cardiaque réelle
                        peut varier selon la fatigue, la température, et la physiologie individuelle.
                    </div>
                </div>
            )}
        </div>
    );
}
