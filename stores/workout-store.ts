import { Session } from "@/types/session";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorkoutState {
    sessionId: string | null;
    blockIndex: number;
    blockRepetition: number; // répétition actuelle du bloc (1-indexed)
    exerciseIndex: number;
    isPaused: boolean;
    pausedAt: number | null; // timestamp de la pause
    currentTimer: number | null; // temps restant en secondes pour l'exo en cours (si type duration)
    timerStartTime: number | null; // timestamp de début du timer
    startedAt: number | null; // timestamp de début de la séance
}

interface WorkoutStore {
    activeWorkout: WorkoutState | null;
    pausedWorkouts: Array<{ sessionId: string; state: WorkoutState; pausedAt: number }>;
    startWorkout: (sessionId: string, startBlockIndex?: number, startBlockRepetition?: number, startExerciseIndex?: number) => void;
    pauseWorkout: () => void;
    resumeWorkout: () => void;
    abandonWorkout: () => void;
    resumePausedWorkout: (sessionId: string) => void;
    removePausedWorkout: (sessionId: string) => void;
    updateWorkoutState: (updates: Partial<WorkoutState>) => void;
    nextExercise: () => void;
    completeExercise: () => void;
    updateTimer: (remainingSeconds: number) => void;
}

const initialState: WorkoutState = {
    sessionId: null,
    blockIndex: 0,
    blockRepetition: 1,
    exerciseIndex: 0,
    isPaused: false,
    pausedAt: null,
    currentTimer: null,
    timerStartTime: null,
    startedAt: null,
};

export const useWorkoutStore = create<WorkoutStore>()(
    persist(
        (set, get) => ({
            activeWorkout: null,
            pausedWorkouts: [],
            startWorkout: (sessionId, startBlockIndex = 0, startBlockRepetition = 1, startExerciseIndex = 0) => {
                set({
                    activeWorkout: {
                        sessionId,
                        blockIndex: startBlockIndex,
                        blockRepetition: startBlockRepetition,
                        exerciseIndex: startExerciseIndex,
                        isPaused: false,
                        pausedAt: null,
                        currentTimer: null,
                        timerStartTime: null,
                        startedAt: Date.now(),
                    },
                });
            },
            pauseWorkout: () => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;

                const pausedState = {
                    ...activeWorkout,
                    isPaused: true,
                    pausedAt: Date.now(),
                };

                set((state) => ({
                    activeWorkout: null,
                    pausedWorkouts: [
                        ...state.pausedWorkouts.filter((w) => w.sessionId !== activeWorkout.sessionId),
                        {
                            sessionId: activeWorkout.sessionId,
                            state: pausedState,
                            pausedAt: Date.now(),
                        },
                    ],
                }));
            },
            resumeWorkout: () => {
                const { activeWorkout } = get();
                if (!activeWorkout || !activeWorkout.isPaused) return;

                const pausedDuration = activeWorkout.pausedAt ? Date.now() - activeWorkout.pausedAt : 0;
                const timerAdjustment = activeWorkout.timerStartTime ? pausedDuration : 0;

                set({
                    activeWorkout: {
                        ...activeWorkout,
                        isPaused: false,
                        pausedAt: null,
                        timerStartTime: activeWorkout.timerStartTime
                            ? activeWorkout.timerStartTime + pausedDuration
                            : null,
                    },
                });
            },
            abandonWorkout: () => {
                set({ activeWorkout: null });
            },
            resumePausedWorkout: (sessionId) => {
                const { pausedWorkouts } = get();
                const pausedWorkout = pausedWorkouts.find((w) => w.sessionId === sessionId);
                if (!pausedWorkout) return;

                const pausedDuration = pausedWorkout.pausedAt ? Date.now() - pausedWorkout.pausedAt : 0;
                const timerAdjustment = pausedWorkout.state.timerStartTime ? pausedDuration : 0;

                set({
                    activeWorkout: {
                        ...pausedWorkout.state,
                        isPaused: false,
                        pausedAt: null,
                        timerStartTime: pausedWorkout.state.timerStartTime
                            ? pausedWorkout.state.timerStartTime + pausedDuration
                            : null,
                    },
                    pausedWorkouts: pausedWorkouts.filter((w) => w.sessionId !== sessionId),
                });
            },
            removePausedWorkout: (sessionId) => {
                set((state) => ({
                    pausedWorkouts: state.pausedWorkouts.filter((w) => w.sessionId !== sessionId),
                }));
            },
            updateWorkoutState: (updates) => {
                set((state) => ({
                    activeWorkout: state.activeWorkout ? { ...state.activeWorkout, ...updates } : null,
                }));
            },
            nextExercise: () => {
                const { activeWorkout } = get();
                if (!activeWorkout) return;

                // Logique de navigation vers le prochain exercice
                // Cette logique sera complétée dans le composant qui gère la séance
                set((state) => ({
                    activeWorkout: state.activeWorkout
                        ? {
                              ...state.activeWorkout,
                              exerciseIndex: state.activeWorkout.exerciseIndex + 1,
                              currentTimer: null,
                              timerStartTime: null,
                          }
                        : null,
                }));
            },
            completeExercise: () => {
                get().nextExercise();
            },
            updateTimer: (remainingSeconds) => {
                set((state) => ({
                    activeWorkout: state.activeWorkout
                        ? {
                              ...state.activeWorkout,
                              currentTimer: remainingSeconds,
                              timerStartTime: state.activeWorkout.timerStartTime || Date.now(),
                          }
                        : null,
                }));
            },
        }),
        {
            name: "workout-storage",
        }
    )
);

