"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { useWorkoutStore } from "@/stores/workout-store";
import { Block, Exercise } from "@/types/session";
import { Check, Pause, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Types pour la queue
type QueueItemType = "exercise" | "pause-between-exercises" | "pause-between-repetitions" | "pause-between-blocks";

interface QueueItem {
    type: QueueItemType;
    exercise?: Exercise;
    pauseDuration?: number;
    blockIndex: number;
    blockRepetition: number;
    exerciseIndex: number;
    block?: Block;
    nextExercise?: Exercise;
}

// Composant pour la liste des blocs (réutilisable)
interface BlocksListProps {
    blocks: Block[];
    currentBlockIndex: number;
    phase: "exercise" | "between-exercises" | "between-blocks" | "completed";
}

const BlocksList = ({ blocks, currentBlockIndex, phase }: BlocksListProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Blocs de la séance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {blocks.map((block, index) => (
                        <div key={block.id} className="flex gap-3">
                            <div
                                className={cn(
                                    "shrink-0 rounded-lg border p-4 min-w-[200px] transition-colors",
                                    index === currentBlockIndex && phase !== "between-blocks"
                                        ? "border-primary bg-primary/5"
                                        : index < currentBlockIndex
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
                            {index < blocks.length - 1 && (
                                <div
                                    className={cn(
                                        "shrink-0 rounded-lg border p-2 min-w-[70px] transition-colors flex flex-col items-center justify-center gap-1",
                                        phase === "between-blocks" && currentBlockIndex === index + 1
                                            ? "border-primary bg-primary/5"
                                            : index < currentBlockIndex
                                            ? "border-muted bg-muted/30 opacity-60"
                                            : "border-muted bg-background"
                                    )}
                                >
                                    <Pause className="size-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">{block.pauseBeforeNext}s</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default function WorkoutRunPage() {
    const { sessions } = useSessionStore();
    const { activeWorkout, pauseWorkout, abandonWorkout, updateWorkoutState } = useWorkoutStore();
    const router = useRouter();

    const [currentTime, setCurrentTime] = useState(0);
    // Index de l'action courante dans la queue (source de vérité unique)
    const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
    // Timer pour les pauses
    const [pauseTimer, setPauseTimer] = useState<number | null>(null);
    const [pauseInitialDuration, setPauseInitialDuration] = useState<number>(0);
    // Timer automatique pour les exercices en répétitions (estimation: 2.5 secondes par répétition)
    const [repsTimer, setRepsTimer] = useState<number | null>(null);
    const [repsTimerStart, setRepsTimerStart] = useState<number | null>(null);

    // Référence pour suivre les annonces déjà faites (éviter les doublons)
    const lastAnnouncedKey = useRef<string>("");
    // Référence pour stocker le timeout en cours
    const currentTimeoutId = useRef<NodeJS.Timeout | null>(null);
    // Référence pour stocker les timeouts actifs (pour ne pas les annuler prématurément)
    const activeTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
    // Référence pour éviter de logger la queue plusieurs fois
    const hasLoggedQueue = useRef(false);
    // Référence pour suivre l'intervalle de pause actif
    const pauseIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const session = useMemo(() => (activeWorkout ? sessions.find((s) => s.id === activeWorkout.sessionId) : null), [sessions, activeWorkout]);

    // Générer la queue complète de la séance (mémorisée)
    const queue = useMemo((): QueueItem[] => {
        if (!session) return [];

        const queueItems: QueueItem[] = [];

        session.blocks.forEach((block, blockIndex) => {
            // Pour chaque répétition du bloc
            for (let repetition = 1; repetition <= block.repetitions; repetition++) {
                // Pour chaque exercice du bloc
                block.exos.forEach((exercise, exerciseIndex) => {
                    // Ajouter l'exercice
                    queueItems.push({
                        type: "exercise",
                        exercise,
                        blockIndex,
                        blockRepetition: repetition,
                        exerciseIndex,
                        block,
                    });

                    // Ajouter une pause entre exercices (sauf après le dernier exercice)
                    if (exerciseIndex < block.exos.length - 1) {
                        queueItems.push({
                            type: "pause-between-exercises",
                            pauseDuration: block.betweenExos,
                            blockIndex,
                            blockRepetition: repetition,
                            exerciseIndex: exerciseIndex + 1, // Prochain exercice
                            block,
                            nextExercise: block.exos[exerciseIndex + 1],
                        });
                    }
                });

                // Ajouter une pause entre répétitions (sauf après la dernière répétition)
                if (repetition < block.repetitions) {
                    queueItems.push({
                        type: "pause-between-repetitions",
                        pauseDuration: block.pause,
                        blockIndex,
                        blockRepetition: repetition + 1, // Prochaine répétition
                        exerciseIndex: 0,
                        block,
                        nextExercise: block.exos[0],
                    });
                }
            }

            // Ajouter une pause entre blocs (sauf après le dernier bloc)
            if (blockIndex < session.blocks.length - 1) {
                const nextBlock = session.blocks[blockIndex + 1];
                queueItems.push({
                    type: "pause-between-blocks",
                    pauseDuration: block.pauseBeforeNext,
                    blockIndex: blockIndex + 1,
                    blockRepetition: 1,
                    exerciseIndex: 0,
                    block: nextBlock,
                    nextExercise: nextBlock.exos[0],
                });
            }
        });

        return queueItems;
    }, [session]);

    // Action courante basée sur l'index dans la queue (source de vérité unique)
    const currentAction = useMemo(() => {
        if (currentQueueIndex < 0 || currentQueueIndex >= queue.length) return null;
        return queue[currentQueueIndex];
    }, [queue, currentQueueIndex]);

    // Phase dérivée de l'action courante (pour compatibilité avec le code existant)
    const phase = useMemo(() => {
        if (!currentAction) return "completed";
        if (currentAction.type === "exercise") return "exercise";
        if (currentAction.type === "pause-between-blocks") return "between-blocks";
        return "between-exercises";
    }, [currentAction]);

    // Log pour vérifier que la queue est bien générée (une seule fois au lancement)
    useEffect(() => {
        if (queue.length > 0 && session && activeWorkout && !hasLoggedQueue.current) {
            console.log("═══════════════════════════════════════════════════════");
            console.log("🚀 LANCEMENT DE LA SÉANCE - QUEUE TOTALE");
            console.log("═══════════════════════════════════════════════════════");
            console.log("📋 Session:", session.name);
            console.log("📊 Nombre total d'éléments dans la queue:", queue.length);
            console.log("📝 Queue complète:");
            queue.forEach((item, index) => {
                const itemInfo: Record<string, string | number> = {
                    index,
                    type: item.type,
                    blockIndex: item.blockIndex,
                    blockRepetition: item.blockRepetition,
                    exerciseIndex: item.exerciseIndex,
                };
                if (item.type === "exercise" && item.exercise) {
                    itemInfo.exerciseName = item.exercise.name;
                    itemInfo.exerciseType = item.exercise.type;
                    itemInfo.exerciseValue = item.exercise.value;
                }
                if (item.pauseDuration) {
                    itemInfo.pauseDuration = item.pauseDuration;
                }
                if (item.nextExercise) {
                    itemInfo.nextExerciseName = item.nextExercise.name;
                }
                console.log(`  [${index}]`, itemInfo);
            });
            console.log("═══════════════════════════════════════════════════════");
            hasLoggedQueue.current = true;
        }
    }, [queue, session, activeWorkout]);

    // Initialiser currentQueueIndex au démarrage et le réinitialiser si la session change
    const queueInitialized = useRef<string | null>(null);
    useEffect(() => {
        if (!activeWorkout || !session || queue.length === 0) {
            // Réinitialiser si pas de workout actif
            if (queueInitialized.current !== null) {
                queueInitialized.current = null;
                setCurrentQueueIndex(0);
                lastAnnouncedKey.current = "";
            }
            return;
        }

        const sessionKey = `${activeWorkout.sessionId}-${activeWorkout.blockIndex}-${activeWorkout.blockRepetition}-${activeWorkout.exerciseIndex}`;

        // Si c'est une nouvelle session ou un nouvel état, réinitialiser
        // MAIS seulement si on est sur un exercice, pas sur une pause
        // Cela évite de sauter les pauses quand moveToNextAction() est appelé
        if (queueInitialized.current !== sessionKey) {
            // Trouver l'index correspondant à l'état actuel du workout
            // On cherche uniquement les exercices pour éviter de sauter les pauses
            const targetIndex = queue.findIndex(
                (item) =>
                    item.blockIndex === activeWorkout.blockIndex &&
                    item.blockRepetition === activeWorkout.blockRepetition &&
                    item.exerciseIndex === activeWorkout.exerciseIndex &&
                    item.type === "exercise"
            );

            if (targetIndex >= 0) {
                console.log("🔄 Initialisation de currentQueueIndex:", {
                    ancien: currentQueueIndex,
                    nouveau: targetIndex,
                    sessionKey,
                    raison: "Synchronisation avec activeWorkout (exercice trouvé)",
                });
                setCurrentQueueIndex(targetIndex);
                queueInitialized.current = sessionKey;
                // Réinitialiser la clé d'annonce pour permettre l'annonce
                lastAnnouncedKey.current = "";
            } else {
                // Si on ne trouve pas d'index correspondant, ne PAS changer l'index
                // Cela peut arriver si on est sur une pause (activeWorkout n'est pas mis à jour pour les pauses)
                console.log("⚠️ Index non trouvé pour sessionKey:", sessionKey, "- Conservation de l'index actuel:", currentQueueIndex);
                // Ne pas changer currentQueueIndex si on ne trouve pas d'exercice correspondant
                // Cela permet de rester sur la pause en cours
                queueInitialized.current = sessionKey;
            }
        }
    }, [activeWorkout, session, queue, currentQueueIndex]);

    // Calculer l'index et l'item dans le useEffect pour éviter les problèmes de timing
    // const currentQueueIndex = getCurrentQueueIndex();
    // const currentQueueItem = currentQueueIndex >= 0 ? queue[currentQueueIndex] : null;

    // Calculer la position actuelle dans la séance basée sur l'action courante (mémorisé)
    const currentBlock = useMemo((): Block | null => {
        if (!session || !currentAction) return null;
        return session.blocks[currentAction.blockIndex] || null;
    }, [session, currentAction]);

    const currentExercise = useMemo((): Exercise | null => {
        if (!currentAction) return null;
        // Pour les exercices, utiliser l'exercice de l'action
        if (currentAction.type === "exercise" && currentAction.exercise) {
            return currentAction.exercise;
        }
        // Pour les pauses, utiliser nextExercise
        if (currentAction.nextExercise) {
            return currentAction.nextExercise;
        }
        // Sinon, chercher dans le bloc
        if (currentBlock) {
            return currentBlock.exos[currentAction.exerciseIndex] || null;
        }
        return null;
    }, [currentAction, currentBlock]);

    const nextBlock = useMemo((): Block | null => {
        if (!session || !currentAction) return null;
        const nextIndex = currentAction.blockIndex + 1;
        return session.blocks[nextIndex] || null;
    }, [session, currentAction]);

    // Navigation vers l'action suivante dans la queue (simplifiée)
    const moveToNextAction = useCallback(() => {
        if (currentQueueIndex >= queue.length - 1) {
            // Séance terminée
            console.log("✅ SÉANCE TERMINÉE");
            toast.success("Séance terminée !");
            return;
        }

        console.log("➡️  NAVIGATION - Passage à l'action suivante");
        console.log("   Index actuel:", currentQueueIndex);
        console.log("   Action actuelle:", currentAction?.type);

        // Passer à l'action suivante dans la queue
        const nextIndex = currentQueueIndex + 1;
        console.log("   🔄 Changement d'index:", currentQueueIndex, "→", nextIndex);
        setCurrentQueueIndex(nextIndex);

        // Réinitialiser les timers
        setRepsTimer(null);
        setRepsTimerStart(null);

        const nextAction = queue[nextIndex];
        if (nextAction) {
            // Ne synchroniser activeWorkout QUE pour les exercices, pas pour les pauses
            // Cela évite que le useEffect d'initialisation saute les pauses
            if (nextAction.type === "exercise") {
                updateWorkoutState({
                    blockIndex: nextAction.blockIndex,
                    blockRepetition: nextAction.blockRepetition,
                    exerciseIndex: nextAction.exerciseIndex,
                    currentTimer: null,
                    timerStartTime: null,
                });
            }
            // Pour les pauses, on ne met PAS à jour activeWorkout pour éviter que le useEffect d'initialisation saute la pause

            // Réinitialiser le timer de pause si on passe à un exercice
            if (nextAction.type === "exercise") {
                setPauseTimer(null);
                setPauseInitialDuration(0);
                // Si c'est un exercice avec durée, initialiser le timer
                if (nextAction.exercise?.type === "duration") {
                    const now = Date.now();
                    updateWorkoutState({
                        currentTimer: nextAction.exercise.value,
                        timerStartTime: now,
                    });
                }
            } else {
                // C'est une pause - réinitialiser le timer pour forcer l'initialisation dans le useEffect
                setPauseTimer(null);
                setPauseInitialDuration(0);
            }

            console.log("   Index suivant:", nextIndex);
            console.log("   Action suivante:", nextAction.type);
        } else if (nextIndex >= queue.length) {
            // Séance terminée
            console.log("✅ SÉANCE TERMINÉE");
            toast.success("Séance terminée !");
        }
    }, [currentQueueIndex, queue, currentAction, updateWorkoutState]);

    // DÉSACTIVÉ: Gestion du timer automatique pour les exercices en répétitions
    // L'utilisateur doit maintenant compléter manuellement les exercices en répétitions
    // useEffect(() => {
    //     ... code désactivé ...
    // }, [activeWorkout, currentAction, activeWorkout?.isPaused, repsTimerStart, moveToNextAction]);

    // Gestion du timer pour les exos avec durée
    useEffect(() => {
        if (!activeWorkout || !currentAction || currentAction.type !== "exercise" || activeWorkout.isPaused) return;

        const exercise = currentAction.exercise;
        if (!exercise || exercise.type !== "duration") return;

        // Réinitialiser le timer des reps si on passe à un exercice en durée
        setRepsTimer(null);
        setRepsTimerStart(null);

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

            // Récupérer l'exercice actuel depuis l'action courante
            // Note: On utilise currentAction depuis la closure, mais on doit vérifier qu'il est toujours valide
            const currentExercise = currentAction?.exercise;
            if (!currentExercise || currentExercise.type !== "duration") return;

            const now = Date.now();
            const startTime = currentState.timerStartTime;
            const elapsed = Math.floor((now - startTime) / 1000);
            const initialTime = currentExercise.value; // Toujours utiliser la valeur initiale de l'exercice
            const remaining = Math.max(0, initialTime - elapsed);

            if (remaining <= 0) {
                clearInterval(interval);
                moveToNextAction();
                return;
            }

            updateWorkoutState({
                currentTimer: remaining,
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [activeWorkout, currentAction, moveToNextAction, updateWorkoutState, currentQueueIndex]);

    // Gestion des pauses entre exos/blocs
    useEffect(() => {
        // Nettoyer l'intervalle précédent s'il existe
        if (pauseIntervalRef.current) {
            clearInterval(pauseIntervalRef.current);
            pauseIntervalRef.current = null;
        }

        if (!currentAction) {
            return;
        }

        // Si on est sur un exercice, réinitialiser le timer de pause
        if (currentAction.type === "exercise") {
            if (pauseTimer !== null) {
                setPauseTimer(null);
                setPauseInitialDuration(0);
            }
            return;
        }

        // C'est une pause - s'assurer que le timer est initialisé
        if (!currentAction.pauseDuration) {
            console.warn("⚠️  Pause sans durée définie, type:", currentAction.type);
            return;
        }

        console.log("⏸️  DÉTECTION PAUSE - Type:", currentAction.type, "Durée:", currentAction.pauseDuration, "Timer actuel:", pauseTimer);

        // Initialiser le timer si nécessaire
        if (pauseTimer === null) {
            console.log("⏸️  ✅ Initialisation du timer de pause:", currentAction.pauseDuration, "secondes");
            setPauseTimer(currentAction.pauseDuration);
            setPauseInitialDuration(currentAction.pauseDuration);
            // Ne pas démarrer le countdown immédiatement - attendre le prochain render
            return;
        }

        // Si le workout est en pause, ne pas décrémenter le timer
        if (activeWorkout?.isPaused) {
            console.log("⏸️  Workout en pause, timer bloqué à:", pauseTimer);
            return;
        }

        // Démarrer le countdown seulement si le timer est > 0
        if (pauseTimer <= 0) {
            console.log("✅ Pause terminée, passage à l'action suivante dans 1000ms");
            // Laisser un délai pour que l'annonce de pause se termine
            setTimeout(() => {
                moveToNextAction();
            }, 1000);
            return;
        }

        // Timer countdown - décrémenter chaque seconde
        console.log("⏸️  Démarrage du countdown de pause, timer:", pauseTimer);
        pauseIntervalRef.current = setInterval(() => {
            setPauseTimer((prev) => {
                if (prev === null || prev <= 0) {
                    if (pauseIntervalRef.current) {
                        clearInterval(pauseIntervalRef.current);
                        pauseIntervalRef.current = null;
                    }
                    return null;
                }

                const newValue = prev - 1;
                console.log("⏸️  Countdown pause:", newValue, "secondes restantes");

                if (newValue <= 0) {
                    // Fin de la pause
                    console.log("⏸️  ✅ Timer de pause atteint 0, passage à l'action suivante dans 1000ms");
                    if (pauseIntervalRef.current) {
                        clearInterval(pauseIntervalRef.current);
                        pauseIntervalRef.current = null;
                    }
                    setTimeout(() => {
                        moveToNextAction();
                    }, 1000);
                    return 0;
                }

                return newValue;
            });
        }, 1000);

        return () => {
            if (pauseIntervalRef.current) {
                clearInterval(pauseIntervalRef.current);
                pauseIntervalRef.current = null;
            }
        };
    }, [currentAction, pauseTimer, activeWorkout?.isPaused, moveToNextAction]);

    // Timer global de la séance
    useEffect(() => {
        if (!activeWorkout || activeWorkout.isPaused || !activeWorkout.startedAt) return;

        const startTime = activeWorkout.startedAt;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setCurrentTime(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [activeWorkout]);

    const handleCompleteExercise = useCallback(() => {
        // Réinitialiser le timer des reps si présent
        if (repsTimer !== null || repsTimerStart !== null) {
            setRepsTimer(null);
            setRepsTimerStart(null);
        }
        moveToNextAction();
    }, [moveToNextAction, repsTimer, repsTimerStart]);

    // Détection de la touche Espace pour terminer rapidement les exercices
    useEffect(() => {
        if (!currentAction || currentAction.type !== "exercise" || activeWorkout?.isPaused) return;

        const handleKeyPress = (event: KeyboardEvent) => {
            // Espace pour terminer l'exercice
            if (event.code === "Space" && !event.repeat) {
                event.preventDefault();
                handleCompleteExercise();
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [currentAction, activeWorkout?.isPaused, handleCompleteExercise]);

    const handlePause = useCallback(() => {
        pauseWorkout();
        toast.info("Séance mise en pause");
        router.push("/workout");
    }, [pauseWorkout, router]);

    const handleAbandon = useCallback(() => {
        abandonWorkout();
        router.push("/workout");
        toast.info("Séance abandonnée");
    }, [abandonWorkout, router]);

    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }, []);

    // Fonction générique pour prononcer du texte (mémorisée)
    const speak = useCallback((text: string) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            return; // L'API n'est pas disponible
        }

        // Annuler toute annonce en cours
        window.speechSynthesis.cancel();

        // Petit délai pour s'assurer que l'annulation est complète avant de déclencher la nouvelle annonce
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "fr-FR";
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            window.speechSynthesis.speak(utterance);
        }, 100);
    }, []);

    // Prononcer l'instruction pour un exercice (mémorisée)
    const speakExerciseInstruction = useCallback(
        (exercise: Exercise) => {
            if (exercise.type === "duration") {
                const memberText = exercise.member ? ` par ${exercise.member}` : "";
                const text = `Faire ${exercise.name} pendant ${exercise.value} seconde${exercise.value > 1 ? "s" : ""}${memberText}`;
                speak(text);
            } else {
                const memberText = exercise.member ? ` par ${exercise.member}` : "";
                const text = `Faire ${exercise.name} ${exercise.value} fois${memberText}, puis valider l'exécution de l'exercice`;
                speak(text);
            }
        },
        [speak]
    );

    // Prononcer l'annonce de pause entre exercices (mémorisée)
    const speakPauseBetweenExercises = useCallback(
        (pauseDuration: number, nextExercise: Exercise | null) => {
            if (nextExercise) {
                const text = `Pause de ${pauseDuration} seconde${pauseDuration > 1 ? "s" : ""} avant de passer à l'exercice ${
                    nextExercise.name
                }. Préparer vous.`;
                speak(text);
            }
        },
        [speak]
    );

    // Prononcer l'annonce de fin de séance (mémorisée)
    const speakWorkoutCompleted = useCallback(() => {
        const text = "Bravo pour cette superbe séance, on se retrouve plus tard !";
        speak(text);
    }, [speak]);

    // Prononcer l'annonce de pause entre répétitions (mémorisée)
    const speakPauseBetweenRepetitions = useCallback(
        (pauseDuration: number, nextRepetition: number, totalRepetitions: number, firstExercise: Exercise) => {
            const text = `Bravo, pause de ${pauseDuration} seconde${
                pauseDuration > 1 ? "s" : ""
            } puis nous passerons à la répétition ${nextRepetition} sur ${totalRepetitions} qui commencera par l'exercice ${firstExercise.name}`;
            speak(text);
        },
        [speak]
    );

    // Prononcer l'annonce de pause entre blocs (mémorisée)
    const speakPauseBetweenBlocks = useCallback(
        (pauseDuration: number, nextBlock: Block, firstExercise: Exercise) => {
            const text = `Super bloc, pause de ${pauseDuration} seconde${pauseDuration > 1 ? "s" : ""} puis nous passerons au bloc suivant ${
                nextBlock.name
            } qui commencera par l'exercice ${firstExercise.name}`;
            speak(text);
        },
        [speak]
    );

    // Gestion des annonces vocales basée sur l'action courante dans la queue
    useEffect(() => {
        if (!activeWorkout || !session || activeWorkout.isPaused) {
            console.log("🔇 Annonce bloquée:", {
                activeWorkout: !!activeWorkout,
                session: !!session,
                isPaused: activeWorkout?.isPaused,
            });
            return;
        }

        if (!currentAction) {
            console.log("🔇 Pas d'action courante:", {
                currentQueueIndex,
                queueLength: queue.length,
                queueValide: queue.length > 0,
                indexValide: currentQueueIndex >= 0 && currentQueueIndex < queue.length,
            });
            return;
        }

        // Créer une clé unique pour cette action
        const actionKey = `${currentAction.type}-${currentAction.blockIndex}-${currentAction.exerciseIndex}-${currentAction.blockRepetition}-${currentQueueIndex}`;

        console.log("🔍 Vérification annonce:", {
            actionKey,
            lastAnnouncedKey: lastAnnouncedKey.current,
            currentQueueIndex,
            actionType: currentAction.type,
            doitAnnoncer: actionKey !== lastAnnouncedKey.current,
            exercise: currentAction.exercise?.name || "N/A",
        });

        // Logger les changements d'étape
        if (actionKey !== lastAnnouncedKey.current) {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("🔄 CHANGEMENT D'ACTION");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("📍 Position dans la queue:", `${currentQueueIndex + 1}/${queue.length}`);
            console.log("🎯 Type d'action:", currentAction.type);
            console.log("📦 Bloc:", {
                index: currentAction.blockIndex,
                name: currentAction.block?.name || "N/A",
                repetition: `${currentAction.blockRepetition}/${currentAction.block?.repetitions || "N/A"}`,
            });
            console.log("💪 Exercice:", {
                index: currentAction.exerciseIndex,
                name: currentAction.exercise?.name || currentAction.nextExercise?.name || "N/A",
                type: currentAction.exercise?.type || currentAction.nextExercise?.type || "N/A",
                value: currentAction.exercise?.value || currentAction.nextExercise?.value || "N/A",
            });
            if (currentAction.pauseDuration) {
                console.log("⏸️  Pause:", {
                    durée: `${currentAction.pauseDuration}s`,
                    type: currentAction.type,
                });
            }
            console.log("🔑 Clé unique:", actionKey);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        }

        // Ne déclencher l'annonce qu'une seule fois pour cette action
        if (actionKey !== lastAnnouncedKey.current) {
            console.log("✅ Nouvelle action détectée, préparation de l'annonce");
            // Ne PAS annuler le timeout précédent - laisser l'annonce se terminer même si l'action change
            // Cela garantit que toutes les annonces sont prononcées
            // Les timeouts se nettoieront automatiquement après exécution

            // Délai plus long pour le premier exercice (index 0)
            const isFirstExercise = currentQueueIndex === 0 && currentAction.type === "exercise";
            // Délai supplémentaire après une pause pour éviter les conflits
            const wasPause = lastAnnouncedKey.current.includes("pause");
            // Délais différents selon le type d'action
            // Augmenter les délais pour éviter que le début des phrases soit coupé
            let baseDelay: number;
            if (currentAction.type === "exercise") {
                baseDelay = currentAction.exercise?.type === "duration" ? 1000 : 800;
            } else {
                // Pour les pauses, délai plus long pour laisser le temps à l'annonce de se terminer
                baseDelay = 1000;
            }
            const delay = isFirstExercise
                ? Math.max(baseDelay, 1500)
                : wasPause && currentAction.type === "exercise"
                ? Math.max(baseDelay, 1500) // Délai supplémentaire après pause
                : baseDelay;

            // Mettre à jour la clé immédiatement pour éviter les doublons
            lastAnnouncedKey.current = actionKey;
            console.log("   ⏱️  Programmation de l'annonce avec délai:", delay, "ms");

            // Capturer les valeurs nécessaires pour éviter les problèmes de closure
            const actionToAnnounce = currentAction;
            const actionType = currentAction.type;

            const timeoutId = setTimeout(() => {
                // Vérifier que le timeout est toujours dans la map des timeouts actifs
                // (cela signifie qu'il n'a pas été explicitement annulé)
                if (!activeTimeouts.current.has(actionKey) || activeTimeouts.current.get(actionKey) !== timeoutId) {
                    console.log("   ⏹️  Timeout annulé avant exécution pour:", actionType, "(actionKey:", actionKey, ")");
                    return;
                }

                // Nettoyer après exécution
                currentTimeoutId.current = null;
                activeTimeouts.current.delete(actionKey);

                // Vérifier que l'action est toujours valide
                if (!actionToAnnounce) {
                    console.error("❌ ERREUR: actionToAnnounce est null au moment de l'annonce!");
                    return;
                }

                console.log("🔊 Annonce vocale déclenchée pour:", actionType);
                console.log("   Détails:", {
                    actionKey,
                    exercise: actionToAnnounce.exercise?.name,
                    pauseDuration: actionToAnnounce.pauseDuration,
                });

                switch (actionType) {
                    case "exercise":
                        if (actionToAnnounce.exercise) {
                            console.log("   ✅ Prononciation de l'exercice:", actionToAnnounce.exercise.name);
                            speakExerciseInstruction(actionToAnnounce.exercise);
                        } else {
                            console.warn("   ⚠️ Exercice manquant dans l'action");
                        }
                        break;
                    case "pause-between-exercises":
                        if (actionToAnnounce.pauseDuration && actionToAnnounce.nextExercise) {
                            speakPauseBetweenExercises(actionToAnnounce.pauseDuration, actionToAnnounce.nextExercise);
                        }
                        break;
                    case "pause-between-repetitions":
                        if (actionToAnnounce.pauseDuration && actionToAnnounce.block && actionToAnnounce.nextExercise) {
                            speakPauseBetweenRepetitions(
                                actionToAnnounce.pauseDuration,
                                actionToAnnounce.blockRepetition,
                                actionToAnnounce.block.repetitions,
                                actionToAnnounce.nextExercise
                            );
                        }
                        break;
                    case "pause-between-blocks":
                        if (actionToAnnounce.pauseDuration && actionToAnnounce.block && actionToAnnounce.nextExercise) {
                            speakPauseBetweenBlocks(actionToAnnounce.pauseDuration, actionToAnnounce.block, actionToAnnounce.nextExercise);
                        }
                        break;
                    default:
                        console.warn("Type d'action non géré:", actionType);
                        break;
                }
            }, delay);

            currentTimeoutId.current = timeoutId;
            activeTimeouts.current.set(actionKey, timeoutId);
            console.log("   📌 Timeout enregistré avec ID:", timeoutId, "pour actionKey:", actionKey);

            return () => {
                // Ne PAS annuler le timeout dans le cleanup
                // Laisser l'annonce se terminer même si l'action change
                // Le timeout se nettoiera lui-même après exécution
                console.log("   ℹ️  Cleanup: timeout laissé actif pour permettre l'annonce (actionKey:", actionKey, ")");
            };
        } else {
            console.log("   ⏭️  Action déjà annoncée, pas de nouvelle annonce");
        }
    }, [
        currentQueueIndex, // Dépendance principale - quand l'index change, on doit vérifier l'annonce
        currentAction, // Action courante (utilisé dans le useEffect)
        queue.length,
        activeWorkout?.isPaused,
        activeWorkout,
        session,
        speakExerciseInstruction,
        speakPauseBetweenExercises,
        speakPauseBetweenRepetitions,
        speakPauseBetweenBlocks,
        queue, // Ajout de queue pour s'assurer que les changements sont détectés
    ]);

    // Prononcer l'annonce de fin de séance
    useEffect(() => {
        if (currentQueueIndex >= queue.length) {
            // Créer une clé unique pour la fin de séance
            const completedKey = "workout-completed";

            // Ne déclencher l'annonce qu'une seule fois
            if (completedKey !== lastAnnouncedKey.current) {
                lastAnnouncedKey.current = completedKey;

                const timeoutId = setTimeout(() => {
                    speakWorkoutCompleted();
                }, 500);

                return () => clearTimeout(timeoutId);
            }
        }
    }, [currentQueueIndex, queue.length, speakWorkoutCompleted]);

    // Redirection si pas de workout actif ou session invalide
    useEffect(() => {
        if (!activeWorkout || !session) {
            router.push("/workout");
        }
    }, [activeWorkout, session, router]);

    // Redirection si bloc ou exercice invalide
    useEffect(() => {
        if (activeWorkout && session && (!currentBlock || !currentExercise)) {
            router.push("/workout");
        }
    }, [activeWorkout, session, currentBlock, currentExercise, router]);

    if (!activeWorkout || !session) {
        return null;
    }

    if (!currentBlock || !currentExercise) {
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
                    <BlocksList blocks={session.blocks} currentBlockIndex={currentAction?.blockIndex ?? activeWorkout.blockIndex} phase={phase} />

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
                    <BlocksList blocks={session.blocks} currentBlockIndex={currentAction?.blockIndex ?? activeWorkout.blockIndex} phase={phase} />

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
                                                currentExercise && (
                                                    <div className="mt-6 pt-6 border-t space-y-2">
                                                        <p className="text-sm text-muted-foreground uppercase tracking-wide">Prochain exercice</p>
                                                        <p className="text-2xl font-bold">{currentExercise.name}</p>
                                                        {currentExercise.member && (
                                                            <p className="text-base text-muted-foreground">par {currentExercise.member}</p>
                                                        )}
                                                        <div className="flex items-center justify-center gap-2 mt-2">
                                                            <span className="text-lg font-semibold">
                                                                {currentExercise.type === "duration"
                                                                    ? `${currentExercise.value} secondes${
                                                                          currentExercise.member ? ` par ${currentExercise.member}` : ""
                                                                      }`
                                                                    : `${currentExercise.value} répétitions${
                                                                          currentExercise.member ? ` par ${currentExercise.member}` : ""
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
                                                    {/* Afficher le timer automatique si actif */}
                                                    {repsTimer !== null && (
                                                        <div className="text-center mt-2">
                                                            <p className="text-sm text-muted-foreground">
                                                                Passage automatique dans :{" "}
                                                                <span className="font-semibold text-primary">{formatTime(repsTimer)}</span>
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                (Appuyez sur Espace pour terminer maintenant)
                                                            </p>
                                                        </div>
                                                    )}
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
                                    <div key={exo.id} className="flex gap-3">
                                        <div
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
                                    </div>
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
