"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { useWorkoutStore } from "@/stores/workout-store";
import { Block, Exercise } from "@/types/session";
import { Check, Pause, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type WorkoutPhase = "exercise" | "between-exercises" | "between-blocks" | "completed";

export default function WorkoutRunPage() {
    const { sessions } = useSessionStore();
    const { activeWorkout, pauseWorkout, abandonWorkout, updateWorkoutState } = useWorkoutStore();
    const router = useRouter();

    const [currentTime, setCurrentTime] = useState(0);
    const [phase, setPhase] = useState<WorkoutPhase>("exercise");
    const [pauseTimer, setPauseTimer] = useState<number | null>(null);
    const [pauseInitialDuration, setPauseInitialDuration] = useState<number>(0);

    const session = activeWorkout ? sessions.find((s) => s.id === activeWorkout.sessionId) : null;

    // Calculer la position actuelle dans la séance
    const getCurrentBlock = (): Block | null => {
        if (!session || !activeWorkout) return null;
        return session.blocks[activeWorkout.blockIndex] || null;
    };

    const getCurrentExercise = (): Exercise | null => {
        const block = getCurrentBlock();
        if (!block || !activeWorkout) return null;
        return block.exos[activeWorkout.exerciseIndex] || null;
    };

    const getNextBlock = (): Block | null => {
        if (!session || !activeWorkout) return null;
        const nextIndex = activeWorkout.blockIndex + 1;
        return session.blocks[nextIndex] || null;
    };

    const getNextExercise = (): Exercise | null => {
        const block = getCurrentBlock();
        if (!block || !activeWorkout) return null;
        const nextIndex = activeWorkout.exerciseIndex + 1;
        return block.exos[nextIndex] || null;
    };

    // Navigation automatique
    const moveToNextExercise = () => {
        if (!session || !activeWorkout) return;

        const block = getCurrentBlock();
        if (!block) return;

        const nextExerciseIndex = activeWorkout.exerciseIndex + 1;

        // Si on a fini tous les exos du bloc
        if (nextExerciseIndex >= block.exos.length) {
            // Vérifier si on a fini toutes les répétitions du bloc
            if (activeWorkout.blockRepetition >= block.repetitions) {
                // Passer au bloc suivant
                const nextBlockIndex = activeWorkout.blockIndex + 1;
                if (nextBlockIndex >= session.blocks.length) {
                    // Séance terminée
                    setPhase("completed");
                    toast.success("Séance terminée !");
                    return;
                }
                // Pause entre blocs
                setPhase("between-blocks");
                setPauseTimer(block.pauseBeforeNext);
                setPauseInitialDuration(block.pauseBeforeNext);
                updateWorkoutState({
                    blockIndex: nextBlockIndex,
                    blockRepetition: 1,
                    exerciseIndex: 0,
                    currentTimer: null,
                    timerStartTime: null,
                });
            } else {
                // Nouvelle répétition du bloc
                setPhase("between-exercises");
                setPauseTimer(block.pause);
                setPauseInitialDuration(block.pause);
                updateWorkoutState({
                    blockRepetition: activeWorkout.blockRepetition + 1,
                    exerciseIndex: 0,
                    currentTimer: null,
                    timerStartTime: null,
                });
            }
        } else {
            // Passer à l'exo suivant dans le bloc
            setPhase("between-exercises");
            setPauseTimer(block.betweenExos);
            setPauseInitialDuration(block.betweenExos);
            updateWorkoutState({
                exerciseIndex: nextExerciseIndex,
                currentTimer: null,
                timerStartTime: null,
            });
        }
    };

    // Gestion du timer pour les exos avec durée
    useEffect(() => {
        if (!activeWorkout || phase !== "exercise" || activeWorkout.isPaused) return;

        const exercise = getCurrentExercise();
        if (!exercise || exercise.type !== "duration") return;

        // Initialiser le timer si nécessaire
        if (activeWorkout.currentTimer === null && activeWorkout.timerStartTime === null) {
            // Utiliser setTimeout pour éviter l'appel impur pendant le rendu
            setTimeout(() => {
                updateWorkoutState({
                    currentTimer: exercise.value,
                    timerStartTime: Date.now(),
                });
            }, 0);
            return;
        }

        // Timer countdown
        const interval = setInterval(() => {
            const currentState = useWorkoutStore.getState().activeWorkout;
            if (!currentState || currentState.isPaused || !currentState.timerStartTime) return;

            const now = Date.now();
            const startTime = currentState.timerStartTime;
            const elapsed = Math.floor((now - startTime) / 1000);
            const initialTime = exercise.value; // Toujours utiliser la valeur initiale de l'exercice
            const remaining = Math.max(0, initialTime - elapsed);

            if (remaining <= 0) {
                clearInterval(interval);
                moveToNextExercise();
                return;
            }

            updateWorkoutState({
                currentTimer: remaining,
            });
        }, 1000);

        return () => clearInterval(interval);
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [activeWorkout?.blockIndex, activeWorkout?.exerciseIndex, activeWorkout?.isPaused, phase, moveToNextExercise, updateWorkoutState]);

    // Gestion des pauses entre exos/blocs
    useEffect(() => {
        if (phase !== "between-exercises" && phase !== "between-blocks") {
            setPauseTimer(null);
            setPauseInitialDuration(0);
            return;
        }

        if (pauseTimer === null || pauseTimer <= 0) {
            // Fin de la pause, passer à l'exo suivant
            if (phase === "between-exercises" || phase === "between-blocks") {
                setPhase("exercise");
                const exercise = getCurrentExercise();
                if (exercise && exercise.type === "duration") {
                    const now = Date.now();
                    updateWorkoutState({
                        currentTimer: exercise.value,
                        timerStartTime: now,
                    });
                }
            }
            return;
        }

        if (activeWorkout?.isPaused) return;

        const interval = setInterval(() => {
            setPauseTimer((prev) => {
                if (prev === null || prev <= 1) {
                    // Fin de la pause
                    setTimeout(() => {
                        setPhase("exercise");
                        const exercise = getCurrentExercise();
                        if (exercise && exercise.type === "duration") {
                            const now = Date.now();
                            updateWorkoutState({
                                currentTimer: exercise.value,
                                timerStartTime: now,
                            });
                        }
                    }, 0);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [phase, pauseTimer, activeWorkout?.isPaused, updateWorkoutState]);

    // Timer global de la séance
    useEffect(() => {
        if (!activeWorkout || activeWorkout.isPaused) return;

        const interval = setInterval(() => {
            if (activeWorkout.startedAt) {
                const elapsed = Math.floor((Date.now() - activeWorkout.startedAt) / 1000);
                setCurrentTime(elapsed);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeWorkout]);

    const handleCompleteExercise = () => {
        moveToNextExercise();
    };

    const handlePause = () => {
        pauseWorkout();
        toast.info("Séance mise en pause");
        router.push("/workout");
    };

    const handleAbandon = () => {
        abandonWorkout();
        router.push("/workout");
        toast.info("Séance abandonnée");
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    if (!activeWorkout || !session) {
        router.push("/workout");
        return null;
    }

    const currentBlock = getCurrentBlock();
    const currentExercise = getCurrentExercise();
    const nextBlock = getNextBlock();
    const nextExercise = getNextExercise();

    if (!currentBlock || !currentExercise) {
        router.push("/workout");
        return null;
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
            {/* Header avec contrôle */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{session.name}</h1>
                    <p className="text-muted-foreground">Temps écoulé : {formatTime(currentTime)}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handlePause} variant="outline">
                        <Pause className="size-4 mr-2" />
                        Pause
                    </Button>
                    <Button onClick={handleAbandon} variant="destructive">
                        <X className="size-4 mr-2" />
                        Abandonner
                    </Button>
                </div>
            </div>

            {/* Phase de pause entre blocs (Card séparée) */}
            {phase === "between-blocks" && pauseTimer !== null && (
                <>
                    {/* Liste des blocs de la séance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Blocs de la séance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {session.blocks.map((block, index) => (
                                    <>
                                        <div
                                            key={block.id}
                                            className={cn(
                                                "shrink-0 rounded-lg border p-4 min-w-[200px] transition-colors",
                                                index === activeWorkout.blockIndex && phase !== "between-blocks"
                                                    ? "border-primary bg-primary/5"
                                                    : index < activeWorkout.blockIndex
                                                    ? "border-muted bg-muted/30 opacity-60"
                                                    : "border-muted bg-background"
                                            )}
                                        >
                                            <p className="font-medium mb-1">{block.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {block.repetitions} répétition{block.repetitions > 1 ? "s" : ""} • {block.exos.length} exercice
                                                {block.exos.length > 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        {/* Pause entre blocs (sauf après le dernier) */}
                                        {index < session.blocks.length - 1 && (
                                            <div
                                                key={`pause-block-${block.id}`}
                                                className={cn(
                                                    "shrink-0 rounded-lg border p-2 min-w-[70px] transition-colors flex flex-col items-center justify-center gap-1",
                                                    phase === "between-blocks" && activeWorkout.blockIndex === index + 1
                                                        ? "border-primary bg-primary/5"
                                                        : index < activeWorkout.blockIndex
                                                        ? "border-muted bg-muted/30 opacity-60"
                                                        : "border-muted bg-background"
                                                )}
                                            >
                                                <Pause className="size-4 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground">{block.pauseBeforeNext}s</p>
                                            </div>
                                        )}
                                    </>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary">
                        <CardContent className="py-12">
                            <div className="rounded-lg border-2 border-primary bg-primary/5 p-6 relative overflow-hidden transition-all duration-500">
                                {/* Animation de progression pour la pause entre blocs */}
                                {pauseInitialDuration > 0 && (
                                    <div
                                        key={`pause-between-blocks-${activeWorkout.blockIndex}`}
                                        className="absolute inset-0 bg-primary/20"
                                        style={{
                                            animation:
                                                Math.max(0, pauseInitialDuration) > 0
                                                    ? `progress-fill ${Math.max(0, pauseInitialDuration)}s linear forwards`
                                                    : "none",
                                        }}
                                    />
                                )}
                                <div className="relative space-y-6 text-center">
                                    <div className="text-6xl font-bold text-primary">{formatTime(pauseTimer)}</div>
                                    <p className="text-muted-foreground">Pause entre blocs</p>

                                    {/* Affichage du prochain bloc pendant la pause entre blocs */}
                                    {nextBlock && (
                                        <div className="mt-8 pt-6 border-t space-y-2">
                                            <p className="text-sm text-muted-foreground uppercase tracking-wide">Prochain bloc</p>
                                            <p className="text-2xl font-bold">{nextBlock.name}</p>
                                            <p className="text-base text-muted-foreground">
                                                {nextBlock.repetitions} répétition{nextBlock.repetitions > 1 ? "s" : ""} • {nextBlock.exos.length}{" "}
                                                exercice
                                                {nextBlock.exos.length > 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Phase d'exercice ou pause entre exercices */}
            {((phase === "exercise" && !activeWorkout.isPaused) || phase === "between-exercises") && (
                <>
                    {/* Liste des blocs de la séance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Blocs de la séance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {session.blocks.map((block, index) => (
                                    <>
                                        <div
                                            key={block.id}
                                            className={cn(
                                                "shrink-0 rounded-lg border p-4 min-w-[200px] transition-colors",
                                                index === activeWorkout.blockIndex
                                                    ? "border-primary bg-primary/5"
                                                    : index < activeWorkout.blockIndex
                                                    ? "border-muted bg-muted/30 opacity-60"
                                                    : "border-muted bg-background"
                                            )}
                                        >
                                            <p className="font-medium mb-1">{block.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {block.repetitions} répétition{block.repetitions > 1 ? "s" : ""} • {block.exos.length} exercice
                                                {block.exos.length > 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        {/* Pause entre blocs (sauf après le dernier) */}
                                        {index < session.blocks.length - 1 && (
                                            <div
                                                key={`pause-block-${block.id}`}
                                                className={cn(
                                                    "shrink-0 rounded-lg border p-2 min-w-[70px] transition-colors flex flex-col items-center justify-center gap-1",
                                                    index < activeWorkout.blockIndex
                                                        ? "border-muted bg-muted/30 opacity-60"
                                                        : "border-muted bg-background"
                                                )}
                                            >
                                                <Pause className="size-4 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground">{block.pauseBeforeNext}s</p>
                                            </div>
                                        )}
                                    </>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bloc en cours */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl w-full">{currentBlock.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Pause entre exercices */}
                                {phase === "between-exercises" && pauseTimer !== null ? (
                                    <div className="rounded-lg border-2 border-primary bg-primary/5 p-6 relative overflow-hidden transition-all duration-500">
                                        {/* Animation de progression pour la pause */}
                                        {pauseInitialDuration > 0 && (
                                            <div
                                                key={`pause-between-exos-${activeWorkout.blockIndex}-${activeWorkout.exerciseIndex}-${activeWorkout.blockRepetition}`}
                                                className="absolute inset-0 bg-primary/20"
                                                style={{
                                                    animation:
                                                        Math.max(0, pauseInitialDuration) > 0
                                                            ? `progress-fill ${Math.max(0, pauseInitialDuration)}s linear forwards`
                                                            : "none",
                                                }}
                                            />
                                        )}
                                        <div className="relative space-y-4 text-center">
                                            <div className="space-y-2">
                                                <div className="text-6xl font-bold text-primary">{formatTime(pauseTimer)}</div>
                                                <p className="text-muted-foreground">
                                                    {activeWorkout.exerciseIndex === 0 && activeWorkout.blockRepetition > 1
                                                        ? "Pause entre répétitions"
                                                        : "Pause entre exercices"}
                                                </p>
                                            </div>
                                            {/* Afficher les répétitions restantes si c'est une pause entre répétitions */}
                                            {activeWorkout.exerciseIndex === 0 && activeWorkout.blockRepetition > 1 ? (
                                                <div className="mt-6 pt-6 border-t space-y-2">
                                                    <p className="text-sm text-muted-foreground uppercase tracking-wide">Répétitions restantes</p>
                                                    <p className="text-4xl font-bold text-primary">
                                                        {currentBlock.repetitions - activeWorkout.blockRepetition + 1}
                                                    </p>
                                                    <p className="text-base text-muted-foreground">
                                                        sur {currentBlock.repetitions} répétition{currentBlock.repetitions > 1 ? "s" : ""}
                                                    </p>
                                                </div>
                                            ) : (
                                                /* Afficher le prochain exercice si c'est une pause entre exercices */
                                                nextExercise && (
                                                    <div className="mt-6 pt-6 border-t space-y-2">
                                                        <p className="text-sm text-muted-foreground uppercase tracking-wide">Prochain exercice</p>
                                                        <p className="text-2xl font-bold">{nextExercise.name}</p>
                                                        {nextExercise.member && (
                                                            <p className="text-base text-muted-foreground">par {nextExercise.member}</p>
                                                        )}
                                                        <div className="flex items-center justify-center gap-2 mt-2">
                                                            <span className="text-lg font-semibold">
                                                                {nextExercise.type === "duration"
                                                                    ? `${nextExercise.value} secondes${
                                                                          nextExercise.member ? ` par ${nextExercise.member}` : ""
                                                                      }`
                                                                    : `${nextExercise.value} répétitions${
                                                                          nextExercise.member ? ` par ${nextExercise.member}` : ""
                                                                      }`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Exo en cours */
                                    <div className="rounded-lg border-2 border-primary bg-primary/5 p-6 relative overflow-hidden transition-all duration-500">
                                        {/* Animation de progression pour les exercices avec timer */}
                                        {currentExercise.type === "duration" && activeWorkout.currentTimer !== null && (
                                            <div
                                                key={`exercise-progress-${activeWorkout.blockIndex}-${activeWorkout.exerciseIndex}-${activeWorkout.blockRepetition}`}
                                                className="absolute inset-0 bg-primary/20"
                                                style={{
                                                    animation:
                                                        currentExercise.value > 0
                                                            ? `progress-fill ${currentExercise.value}s linear forwards`
                                                            : "none",
                                                }}
                                            />
                                        )}
                                        <div className="relative space-y-4">
                                            <h3 className="text-xl font-semibold">{currentExercise.name}</h3>
                                            {currentExercise.type === "duration" ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-baseline gap-2">
                                                        <div className="text-4xl font-bold text-primary">
                                                            {activeWorkout.currentTimer !== null
                                                                ? formatTime(activeWorkout.currentTimer)
                                                                : formatTime(currentExercise.value)}
                                                        </div>
                                                        <span className="text-xl font-semibold text-foreground">
                                                            {currentExercise.member ? `secondes par ${currentExercise.member}` : "secondes"}
                                                        </span>
                                                    </div>
                                                    {!currentExercise.member && (
                                                        <p className="text-base font-medium text-foreground">Temps restant</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex items-baseline gap-2">
                                                        <div className="text-4xl font-bold text-primary">{currentExercise.value}</div>
                                                        <span className="text-xl font-semibold text-foreground">
                                                            {currentExercise.member ? `répétitions par ${currentExercise.member}` : "répétitions"}
                                                        </span>
                                                    </div>
                                                    <Button onClick={handleCompleteExercise} className="mt-4" size="lg">
                                                        <Check className="size-4 mr-2" />
                                                        Terminer l&apos;exercice
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Liste des exos du bloc */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <p>
                                    Exercices du bloc - <b>{currentBlock.name}</b>
                                </p>
                                <b>
                                    Répétition {activeWorkout.blockRepetition}/{currentBlock.repetitions}
                                </b>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {currentBlock.exos.map((exo, index) => (
                                    <>
                                        <div
                                            key={exo.id}
                                            className={cn(
                                                "shrink-0 rounded-lg border p-4 min-w-[180px] transition-colors",
                                                index === activeWorkout.exerciseIndex && phase === "exercise"
                                                    ? "border-primary bg-primary/5"
                                                    : index < activeWorkout.exerciseIndex
                                                    ? "border-muted bg-muted/30 opacity-60"
                                                    : "border-muted bg-background"
                                            )}
                                        >
                                            <p className="font-medium mb-1">{exo.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {exo.type === "duration"
                                                    ? `${exo.value}s${exo.member ? ` par ${exo.member}` : ""}`
                                                    : `${exo.value} rép.${exo.member ? ` par ${exo.member}` : ""}`}
                                            </p>
                                        </div>
                                        {/* Pause entre exercices (sauf après le dernier) */}
                                        {index < currentBlock.exos.length - 1 && (
                                            <div
                                                key={`pause-${exo.id}`}
                                                className={cn(
                                                    "shrink-0 rounded-lg border p-2 min-w-[70px] transition-colors flex flex-col items-center justify-center gap-1",
                                                    phase === "between-exercises" && activeWorkout.exerciseIndex === index + 1
                                                        ? "border-primary bg-primary/5"
                                                        : index + 1 <= activeWorkout.exerciseIndex
                                                        ? "border-muted bg-muted/30 opacity-60"
                                                        : "border-muted bg-background"
                                                )}
                                            >
                                                <Pause className="size-4 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground">{currentBlock.betweenExos}s</p>
                                            </div>
                                        )}
                                    </>
                                ))}
                                {/* Pause entre répétitions (après le dernier exercice, sauf si dernière répétition) */}
                                {activeWorkout.blockRepetition < currentBlock.repetitions && (
                                    <div
                                        key="pause-between-repetitions"
                                        className={cn(
                                            "shrink-0 rounded-lg border p-2 min-w-[70px] transition-colors flex flex-col items-center justify-center gap-1",
                                            phase === "between-exercises" && activeWorkout.exerciseIndex === 0 && activeWorkout.blockRepetition > 1
                                                ? "border-primary bg-primary/5"
                                                : activeWorkout.blockRepetition > 1
                                                ? "border-muted bg-muted/30 opacity-60"
                                                : "border-muted bg-background"
                                        )}
                                    >
                                        <Pause className="size-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">{currentBlock.pause}s</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prochain bloc */}
                    {nextBlock && (
                        <p className="text-center text-muted-foreground">
                            Prochain bloc : <span className="font-semibold text-foreground">{nextBlock.name}</span>
                        </p>
                    )}
                </>
            )}

            {/* Séance terminée */}
            {phase === "completed" && (
                <Card className="border-primary">
                    <CardContent className="py-12 text-center">
                        <div className="space-y-4">
                            <div className="text-4xl font-bold text-primary">Séance terminée !</div>
                            <p className="text-muted-foreground">Temps total : {formatTime(currentTime)}</p>
                            <Button onClick={() => router.push("/workout")} size="lg">
                                Retour aux séances
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
