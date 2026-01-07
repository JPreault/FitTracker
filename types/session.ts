export interface Exercise {
    id: string;
    name: string;
    type: "reps" | "duration";
    value: number;
    member?: string; // ex: "jambes", "côtés", etc.
}

export interface Block {
    id: string;
    name: string;
    repetitions: number;
    pause: number; // secondes entre chaque répétition
    betweenExos: number; // secondes entre chaque exo du bloc
    exos: Exercise[];
}

export interface Session {
    id: string;
    name: string;
    blocks: Block[];
    duration?: number; // minutes (optionnel)
    createdAt: number;
    updatedAt: number;
}

