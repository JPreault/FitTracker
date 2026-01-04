"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateDistance, calculatePace, calculateTime, secondsToTime, timeToSeconds } from "@/lib/calculators/pace";
import { cn } from "@/lib/utils";
import { Activity, ArrowRightLeft, Calculator, Gauge, MapPin, Timer } from "lucide-react";
import { useEffect, useState } from "react";

type CalculationMode = "pace" | "time" | "distance";

export default function AllurePage() {
    const [mode, setMode] = useState<CalculationMode>("pace");

    // Distance state
    const [distance, setDistance] = useState<string>("");

    // Time state
    const [hours, setHours] = useState<string>("");
    const [minutes, setMinutes] = useState<string>("");
    const [seconds, setSeconds] = useState<string>("");

    // Pace state
    const [paceMinutes, setPaceMinutes] = useState<string>("");
    const [paceSeconds, setPaceSeconds] = useState<string>("");

    // Result state
    const [result, setResult] = useState<{
        main: string;
        sub?: string;
        detail?: string;
    } | null>(null);

    const [error, setError] = useState<string | null>(null);

    const handleCalculate = () => {
        setError(null);
        setResult(null);

        const distVal = parseFloat(distance);
        const timeVal = timeToSeconds({
            hours: parseInt(hours || "0"),
            minutes: parseInt(minutes || "0"),
            seconds: parseInt(seconds || "0"),
        });
        const paceVal = timeToSeconds({
            hours: 0,
            minutes: parseInt(paceMinutes || "0"),
            seconds: parseInt(paceSeconds || "0"),
        });

        try {
            if (mode === "pace") {
                if (!distance || distVal <= 0) throw new Error("Veuillez entrer une distance valide.");
                if (timeVal <= 0) throw new Error("Veuillez entrer un temps valide.");

                const { paceSecondsPerKm, speedKmh } = calculatePace(distVal, timeVal);
                const p = secondsToTime(paceSecondsPerKm);

                setResult({
                    main: `${p.minutes}:${p.seconds.toString().padStart(2, "0")} /km`,
                    sub: `${speedKmh.toFixed(2)} km/h`,
                    detail: "Allure calculée",
                });
            } else if (mode === "time") {
                if (!distance || distVal <= 0) throw new Error("Veuillez entrer une distance valide.");
                if (paceVal <= 0) throw new Error("Veuillez entrer une allure valide.");

                const totalSeconds = calculateTime(distVal, paceVal);
                const t = secondsToTime(totalSeconds);

                setResult({
                    main: `${t.hours > 0 ? t.hours + "h " : ""}${t.minutes}m ${t.seconds}s`,
                    detail: "Temps estimé",
                });
            } else if (mode === "distance") {
                if (timeVal <= 0) throw new Error("Veuillez entrer un temps valide.");
                if (paceVal <= 0) throw new Error("Veuillez entrer une allure valide.");

                const dist = calculateDistance(timeVal, paceVal);

                setResult({
                    main: `${dist.toFixed(2)} km`,
                    detail: "Distance estimée",
                });
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Clear result when mode changes
    useEffect(() => {
        setResult(null);
        setError(null);
    }, [mode]);

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Convertisseur Allure</h1>
                <p className="text-muted-foreground">Calculez votre temps, distance ou allure en fonction de vos objectifs.</p>
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as CalculationMode)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="pace" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Gauge className="w-4 h-4 mr-2" /> Allure
                    </TabsTrigger>
                    <TabsTrigger value="time" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Timer className="w-4 h-4 mr-2" /> Temps
                    </TabsTrigger>
                    <TabsTrigger value="distance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <MapPin className="w-4 h-4 mr-2" /> Distance
                    </TabsTrigger>
                </TabsList>

                <div className="grid gap-6">
                    {/* Inputs Section */}
                    <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calculator className="w-5 h-5 text-primary" />
                                Données
                            </CardTitle>
                            <CardDescription>Remplissez les champs nécessaires pour le calcul.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            {/* Distance Input */}
                            <div
                                className={cn(
                                    "grid gap-2 transition-opacity duration-200",
                                    mode === "distance" ? "opacity-50 pointer-events-none" : "opacity-100"
                                )}
                            >
                                <Label htmlFor="distance" className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Distance (km)
                                </Label>
                                <Input
                                    id="distance"
                                    type="number"
                                    placeholder="ex: 10, 42.195"
                                    value={distance}
                                    onChange={(e) => setDistance(e.target.value)}
                                    step="0.01"
                                    min="0"
                                />
                            </div>

                            {/* Time Input */}
                            <div
                                className={cn(
                                    "grid gap-2 transition-opacity duration-200",
                                    mode === "time" ? "opacity-50 pointer-events-none" : "opacity-100"
                                )}
                            >
                                <Label className="flex items-center gap-2">
                                    <Timer className="w-4 h-4" /> Temps
                                </Label>
                                <div className="flex gap-2 items-center">
                                    <div className="grid gap-1 flex-1">
                                        <Input placeholder="HH" type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
                                        <span className="text-[10px] text-muted-foreground text-center">Heures</span>
                                    </div>
                                    <span className="font-bold">:</span>
                                    <div className="grid gap-1 flex-1">
                                        <Input
                                            placeholder="MM"
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={minutes}
                                            onChange={(e) => setMinutes(e.target.value)}
                                        />
                                        <span className="text-[10px] text-muted-foreground text-center">Minutes</span>
                                    </div>
                                    <span className="font-bold">:</span>
                                    <div className="grid gap-1 flex-1">
                                        <Input
                                            placeholder="SS"
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={seconds}
                                            onChange={(e) => setSeconds(e.target.value)}
                                        />
                                        <span className="text-[10px] text-muted-foreground text-center">Secondes</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pace Input */}
                            <div
                                className={cn(
                                    "grid gap-2 transition-opacity duration-200",
                                    mode === "pace" ? "opacity-50 pointer-events-none" : "opacity-100"
                                )}
                            >
                                <Label className="flex items-center gap-2">
                                    <Gauge className="w-4 h-4" /> Allure (min/km)
                                </Label>
                                <div className="flex gap-2 items-center">
                                    <div className="grid gap-1 flex-1">
                                        <Input
                                            placeholder="MM"
                                            type="number"
                                            min="0"
                                            value={paceMinutes}
                                            onChange={(e) => setPaceMinutes(e.target.value)}
                                        />
                                        <span className="text-[10px] text-muted-foreground text-center">Minutes</span>
                                    </div>
                                    <span className="font-bold">:</span>
                                    <div className="grid gap-1 flex-1">
                                        <Input
                                            placeholder="SS"
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={paceSeconds}
                                            onChange={(e) => setPaceSeconds(e.target.value)}
                                        />
                                        <span className="text-[10px] text-muted-foreground text-center">Secondes</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleCalculate} className="w-full" size="lg">
                                <Activity className="w-4 h-4 mr-2" /> Calculer
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Results Section */}
                    {error && (
                        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium animate-in zoom-in-95">{error}</div>
                    )}

                    {result && (
                        <Card className="border-primary/20 bg-primary/5 shadow-inner animate-in zoom-in-95 duration-300">
                            <CardHeader className="pb-2">
                                <CardDescription>{result.detail}</CardDescription>
                                <CardTitle className="text-4xl font-black text-primary tracking-tight">{result.main}</CardTitle>
                            </CardHeader>
                            {result.sub && (
                                <CardContent>
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                        <ArrowRightLeft className="w-4 h-4" />
                                        {result.sub}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    )}
                </div>
            </Tabs>
        </div>
    );
}
