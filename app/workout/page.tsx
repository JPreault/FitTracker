"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSessionStore } from "@/stores/session-store";
import { useWorkoutStore } from "@/stores/workout-store";
import { Session } from "@/types/session";
import { Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function WorkoutPage() {
    const { sessions } = useSessionStore();
    const { pausedWorkouts, resumePausedWorkout, removePausedWorkout } = useWorkoutStore();
    const router = useRouter();
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [startBlockIndex, setStartBlockIndex] = useState<number>(0);
    const [startBlockRepetition, setStartBlockRepetition] = useState<number>(1);
    const [startExerciseIndex, setStartExerciseIndex] = useState<number>(0);
    const [isStartSheetOpen, setIsStartSheetOpen] = useState(false);

    const handleStartWorkout = (session: Session) => {
        if (session.blocks.length === 0) {
            toast.error("Cette séance ne contient aucun bloc");
            return;
        }
        setSelectedSession(session);
        setStartBlockIndex(0);
        setStartBlockRepetition(1);
        setStartExerciseIndex(0);
        setIsStartSheetOpen(true);
    };

    const handleLaunchWorkout = () => {
        if (!selectedSession) return;

        const { startWorkout } = useWorkoutStore.getState();
        startWorkout(selectedSession.id, startBlockIndex, startBlockRepetition, startExerciseIndex);
        setIsStartSheetOpen(false);
        router.push("/workout/run");
    };

    const handleResumePaused = (sessionId: string) => {
        resumePausedWorkout(sessionId);
        router.push("/workout/run");
    };

    const handleRemovePaused = (sessionId: string) => {
        removePausedWorkout(sessionId);
        toast.success("Séance en pause supprimée");
    };

    const getPausedSession = (sessionId: string) => {
        return sessions.find((s) => s.id === sessionId);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Lancer une séance</h1>
                <p className="text-muted-foreground">Sélectionnez une séance pour commencer votre entraînement.</p>
            </div>

            {/* Séances en pause */}
            {pausedWorkouts.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Séances en pause</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pausedWorkouts.map((paused) => {
                            const session = getPausedSession(paused.sessionId);
                            if (!session) return null;

                            return (
                                <Card key={paused.sessionId}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{session.name}</CardTitle>
                                        <CardDescription>En pause depuis {new Date(paused.pausedAt).toLocaleTimeString()}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex gap-2">
                                        <Button onClick={() => handleResumePaused(paused.sessionId)} className="flex-1" variant="default">
                                            <Play className="size-4 mr-2" />
                                            Reprendre
                                        </Button>
                                        <Button onClick={() => handleRemovePaused(paused.sessionId)} variant="outline" size="icon">
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Liste des séances */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Séances disponibles</h2>
                {sessions.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">Aucune séance disponible</p>
                            <Button asChild>
                                <a href="/sessions">Créer une séance</a>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {sessions.map((session) => (
                            <Card key={session.id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{session.name}</CardTitle>
                                    <CardDescription>
                                        {session.blocks.length} bloc{session.blocks.length > 1 ? "s" : ""}
                                        {session.duration && ` • ${session.duration} min`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={() => handleStartWorkout(session)} className="w-full" variant="default">
                                        <Play className="size-4 mr-2" />
                                        Lancer
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Sheet de configuration de démarrage */}
            {selectedSession && (
                <Sheet open={isStartSheetOpen} onOpenChange={setIsStartSheetOpen}>
                    <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                        <SheetHeader>
                            <SheetTitle>Lancer &quot;{selectedSession.name}&quot;</SheetTitle>
                            <SheetDescription>Configurez le point de départ de votre séance.</SheetDescription>
                        </SheetHeader>

                        <SheetBody className="grid gap-6 py-6">
                            {/* Bloc de départ */}
                            <div className="space-y-3">
                                <Label htmlFor="start-block">Bloc de départ</Label>
                                <Select
                                    value={startBlockIndex.toString()}
                                    onValueChange={(value) => {
                                        setStartBlockIndex(parseInt(value));
                                        setStartBlockRepetition(1);
                                        setStartExerciseIndex(0);
                                    }}
                                >
                                    <SelectTrigger id="start-block">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedSession.blocks.map((block, index) => (
                                            <SelectItem key={block.id} value={index.toString()}>
                                                {block.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Répétition du bloc */}
                            {selectedSession.blocks[startBlockIndex] && (
                                <div className="space-y-3">
                                    <Label htmlFor="start-repetition">Répétition du bloc</Label>
                                    <Select
                                        value={startBlockRepetition.toString()}
                                        onValueChange={(value) => {
                                            setStartBlockRepetition(parseInt(value));
                                            setStartExerciseIndex(0);
                                        }}
                                    >
                                        <SelectTrigger id="start-repetition">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: selectedSession.blocks[startBlockIndex].repetitions }, (_, i) => i + 1).map(
                                                (rep) => (
                                                    <SelectItem key={rep} value={rep.toString()}>
                                                        Répétition {rep}
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Exercice de départ */}
                            {selectedSession.blocks[startBlockIndex]?.exos.length > 0 && (
                                <div className="space-y-3">
                                    <Label htmlFor="start-exercise">Exercice de départ</Label>
                                    <Select value={startExerciseIndex.toString()} onValueChange={(value) => setStartExerciseIndex(parseInt(value))}>
                                        <SelectTrigger id="start-exercise">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedSession.blocks[startBlockIndex].exos.map((exo, index) => (
                                                <SelectItem key={exo.id} value={index.toString()}>
                                                    {exo.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </SheetBody>

                        <SheetFooter className="flex-col gap-2">
                            <Button onClick={handleLaunchWorkout} className="w-full">
                                <Play className="size-4 mr-2" />
                                Démarrer la séance
                            </Button>
                            <Button variant="outline" onClick={() => setIsStartSheetOpen(false)} className="w-full">
                                Annuler
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            )}
        </div>
    );
}
