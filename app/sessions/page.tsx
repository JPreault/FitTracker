"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetBody, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSessionStore } from "@/stores/session-store";
import { Block, Exercise, Session } from "@/types/session";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, Download, Edit, GripVertical, MoreVertical, Plus, Square, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SessionsPage() {
    const { sessions, addSession, updateSession, deleteSession, importSessions } = useSessionStore();
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

    const handleExport = () => {
        if (selectedSessions.size === 0) {
            toast.error("Veuillez sélectionner au moins une séance à exporter");
            return;
        }

        const sessionsToExport = sessions.filter((s) => selectedSessions.has(s.id));
        const json = JSON.stringify(sessionsToExport, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sessions-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(
            `${sessionsToExport.length} séance${sessionsToExport.length > 1 ? "s" : ""} exportée${
                sessionsToExport.length > 1 ? "s" : ""
            } avec succès !`
        );
        setSelectedSessions(new Set());
    };

    const toggleSelectAll = () => {
        if (selectedSessions.size === sessions.length) {
            setSelectedSessions(new Set());
        } else {
            setSelectedSessions(new Set(sessions.map((s) => s.id)));
        }
    };

    const toggleSelectSession = (sessionId: string) => {
        const newSelected = new Set(selectedSessions);
        if (newSelected.has(sessionId)) {
            newSelected.delete(sessionId);
        } else {
            newSelected.add(sessionId);
        }
        setSelectedSessions(newSelected);
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    const parsed = JSON.parse(content);

                    // Valider que c'est un tableau
                    if (!Array.isArray(parsed)) {
                        toast.error("Le fichier doit contenir un tableau de séances");
                        return;
                    }

                    // Valider la structure de base des séances
                    const validSessions: Session[] = [];
                    for (const item of parsed) {
                        if (typeof item === "object" && item !== null && typeof item.name === "string" && Array.isArray(item.blocks)) {
                            // Valider les blocs
                            const validBlocks: Block[] = [];
                            for (const block of item.blocks) {
                                if (
                                    typeof block === "object" &&
                                    block !== null &&
                                    typeof block.name === "string" &&
                                    typeof block.repetitions === "number" &&
                                    typeof block.pause === "number" &&
                                    typeof block.betweenExos === "number" &&
                                    Array.isArray(block.exos)
                                ) {
                                    // Valider les exercices
                                    const validExos: Exercise[] = [];
                                    for (const exo of block.exos) {
                                        if (
                                            typeof exo === "object" &&
                                            exo !== null &&
                                            typeof exo.name === "string" &&
                                            (exo.type === "reps" || exo.type === "duration") &&
                                            typeof exo.value === "number"
                                        ) {
                                            validExos.push({
                                                id: exo.id || `exo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                                name: exo.name,
                                                type: exo.type,
                                                value: exo.value,
                                                member: typeof exo.member === "string" ? exo.member : undefined,
                                            });
                                        }
                                    }
                                    validBlocks.push({
                                        id: block.id || `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                        name: block.name,
                                        repetitions: block.repetitions,
                                        pause: block.pause,
                                        betweenExos: block.betweenExos,
                                        exos: validExos,
                                    });
                                }
                            }
                            validSessions.push({
                                id: item.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                name: item.name,
                                blocks: validBlocks,
                                duration: typeof item.duration === "number" ? item.duration : undefined,
                                createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
                                updatedAt: Date.now(),
                            });
                        }
                    }

                    if (validSessions.length === 0) {
                        toast.error("Aucune séance valide trouvée dans le fichier");
                        return;
                    }

                    importSessions(validSessions);
                    toast.success(
                        `${validSessions.length} séance${validSessions.length > 1 ? "s" : ""} importée${
                            validSessions.length > 1 ? "s" : ""
                        } avec succès !`
                    );
                } catch (error) {
                    console.error("Erreur lors de l'import:", error);
                    toast.error("Erreur lors de l'import. Vérifiez que le fichier est un JSON valide.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleDelete = (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette séance ?")) {
            deleteSession(id);
            const newSelected = new Set(selectedSessions);
            newSelected.delete(id);
            setSelectedSessions(newSelected);
            toast.success("Séance supprimée");
        }
    };

    // Sensors pour le drag and drop (support mobile et desktop)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Délai de 8px avant activation pour éviter les conflits avec le scroll
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleBlockDragEnd = (event: DragEndEvent, sessionId: string) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const oldIndex = session.blocks.findIndex((block) => block.id === active.id);
        const newIndex = session.blocks.findIndex((block) => block.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newBlocks = arrayMove(session.blocks, oldIndex, newIndex);
            updateSession(sessionId, { blocks: newBlocks });
        }
    };

    const handleExerciseDragEnd = (event: DragEndEvent, sessionId: string, blockIndex: number) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const block = session.blocks[blockIndex];
        if (!block) return;

        const oldIndex = block.exos.findIndex((exo) => exo.id === active.id);
        const newIndex = block.exos.findIndex((exo) => exo.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newExos = arrayMove(block.exos, oldIndex, newIndex);
            const newBlocks = [...session.blocks];
            newBlocks[blockIndex] = { ...block, exos: newExos };
            updateSession(sessionId, { blocks: newBlocks });
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4 sm:justify-between">
                <div className="shrink-0 min-w-0 flex-1 sm:flex-[1_1_280px] sm:max-w-full">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Mes Séances</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Créez et gérez vos séances de sport personnalisées.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:shrink-0 w-full sm:w-auto sm:flex-[0_0_auto] flex-wrap max-w-full">
                    <div className="flex gap-2 sm:grow">
                        {sessions.length > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={toggleSelectAll}
                                    size="sm"
                                    className={`flex-1 sm:flex-initial sm:grow min-w-0 ${
                                        selectedSessions.size === sessions.length ? "bg-primary/10" : ""
                                    }`}
                                >
                                    {selectedSessions.size === sessions.length ? (
                                        <CheckSquare className="size-4 sm:mr-2 shrink-0" />
                                    ) : (
                                        <Square className="size-4 sm:mr-2 shrink-0" />
                                    )}
                                    <span className="hidden sm:inline truncate">
                                        {selectedSessions.size === sessions.length ? "Tout désélectionner" : "Tout sélectionner"}
                                    </span>
                                    <span className="sm:hidden">Tout</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleExport}
                                    disabled={selectedSessions.size === 0}
                                    size="sm"
                                    className="flex-initial min-w-0"
                                >
                                    <Download className="size-4 shrink-0" />
                                    <span className="hidden sm:inline sm:ml-2 truncate">Exporter</span>
                                    {selectedSessions.size > 0 && <span className="ml-1 sm:ml-2">({selectedSessions.size})</span>}
                                </Button>
                            </>
                        )}
                        <Button variant="outline" onClick={handleImport} size="sm" className="flex-initial min-w-0">
                            <Upload className="size-4 shrink-0" />
                            <span className="hidden sm:inline sm:ml-2 truncate">Importer</span>
                        </Button>
                    </div>
                    <CreateSessionForm
                        onSave={(sessionData) => {
                            addSession(sessionData);
                            toast.success("Séance créée avec succès !");
                        }}
                        className="w-full sm:w-auto sm:shrink-0 sm:grow"
                    />
                </div>
            </div>

            {/* Sessions List */}
            {sessions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <p className="text-muted-foreground mb-4">Aucune séance créée pour le moment.</p>
                        <CreateSessionForm
                            onSave={(sessionData) => {
                                addSession(sessionData);
                                toast.success("Séance créée avec succès !");
                            }}
                            className="w-full sm:w-auto"
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {sessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            isSelected={selectedSessions.has(session.id)}
                            onSelect={() => toggleSelectSession(session.id)}
                            onDelete={() => handleDelete(session.id)}
                            sensors={sensors}
                            onBlockDragEnd={(event) => handleBlockDragEnd(event, session.id)}
                            onExerciseDragEnd={(event, blockIndex) => handleExerciseDragEnd(event, session.id, blockIndex)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Formulaire simple pour créer une séance (juste nom + durée)
function CreateSessionForm({
    onSave,
    className,
}: {
    onSave: (sessionData: Omit<Session, "id" | "createdAt" | "updatedAt">) => void;
    className?: string;
}) {
    const [name, setName] = useState("");
    const [duration, setDuration] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Le nom de la séance est requis");
            return;
        }

        onSave({
            name: name.trim(),
            blocks: [],
            duration: duration ? parseInt(duration) : undefined,
        });
        setName("");
        setDuration("");
        setIsOpen(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button size="sm" className={className}>
                    <Plus className="size-4 mr-2" />
                    <span className="hidden sm:inline">Nouvelle séance</span>
                    <span className="sm:hidden">Nouvelle</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Nouvelle séance</SheetTitle>
                    <SheetDescription>Créez une nouvelle séance de sport. Vous pourrez ajouter des blocs ensuite.</SheetDescription>
                </SheetHeader>

                <SheetBody className="grid gap-6 py-6">
                    <div className="space-y-3">
                        <Label htmlFor="session-name">Nom de la séance *</Label>
                        <Input
                            id="session-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Entraînement Full Body"
                            className="text-base"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="duration">Durée estimée (minutes)</Label>
                        <Input
                            id="duration"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="Optionnel"
                            className="text-base"
                        />
                    </div>
                </SheetBody>

                <SheetFooter className="flex-col gap-2">
                    <Button onClick={handleSave} className="w-full">
                        Créer la séance
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                        Annuler
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Carte d'une séance avec ses blocs
function SessionCard({
    session,
    isSelected,
    onSelect,
    onDelete,
    sensors,
    onBlockDragEnd,
    onExerciseDragEnd,
}: {
    session: Session;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    sensors: ReturnType<typeof useSensors>;
    onBlockDragEnd: (event: DragEndEvent) => void;
    onExerciseDragEnd: (event: DragEndEvent, blockIndex: number) => void;
}) {
    const { updateSession } = useSessionStore();
    const [editingSession, setEditingSession] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    const handleBlockDragStart = (event: DragStartEvent) => {
        setActiveBlockId(event.active.id as string);
    };

    const handleBlockDragEnd = (event: DragEndEvent) => {
        setActiveBlockId(null);
        onBlockDragEnd(event);
    };

    const handleExerciseDragEnd = (event: DragEndEvent, blockIndex: number) => {
        onExerciseDragEnd(event, blockIndex);
    };

    return (
        <Card className={isSelected ? "ring-2 ring-primary" : ""}>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <Checkbox checked={isSelected} onChange={onSelect} className="mt-1" />
                        <div className="flex-1">
                            <CardTitle className="text-2xl mb-2">{session.name}</CardTitle>
                            {session.duration && <CardDescription className="text-base">Durée estimée : {session.duration} minutes</CardDescription>}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="size-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingSession(true)}>
                                <Edit className="size-4 mr-2 text-white hover:text-accent-foreground" />
                                Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} variant="destructive">
                                <Trash2 className="size-4 mr-2" />
                                Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Liste des blocs */}
                {session.blocks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-4">Aucun bloc dans cette séance</p>
                        <CreateBlockForm
                            onSave={(block) => {
                                updateSession(session.id, {
                                    blocks: [...session.blocks, block],
                                });
                                toast.success("Bloc ajouté avec succès !");
                            }}
                        />
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                        onDragStart={handleBlockDragStart}
                        onDragEnd={handleBlockDragEnd}
                    >
                        <SortableContext items={session.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-4">
                                {session.blocks.map((block, blockIndex) => (
                                    <SortableBlock
                                        key={block.id}
                                        sessionId={session.id}
                                        block={block}
                                        blockIndex={blockIndex}
                                        sensors={sensors}
                                        onExerciseDragEnd={(event) => handleExerciseDragEnd(event, blockIndex)}
                                        onUpdate={(updates) => {
                                            const newBlocks = [...session.blocks];
                                            newBlocks[blockIndex] = { ...block, ...updates };
                                            updateSession(session.id, { blocks: newBlocks });
                                        }}
                                        onDelete={() => {
                                            const newBlocks = session.blocks.filter((b) => b.id !== block.id);
                                            updateSession(session.id, { blocks: newBlocks });
                                            toast.success("Bloc supprimé");
                                        }}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeBlockId ? (
                                <div className="rounded-lg border bg-muted/30 p-6 opacity-50">
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="size-5 text-muted-foreground" />
                                        <div>
                                            <h3 className="font-semibold text-lg">
                                                {session.blocks.find((b) => b.id === activeBlockId)?.name || "Bloc"}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
                {session.blocks.length > 0 && (
                    <div className="pt-2">
                        <CreateBlockForm
                            onSave={(block) => {
                                updateSession(session.id, {
                                    blocks: [...session.blocks, block],
                                });
                                toast.success("Bloc ajouté avec succès !");
                            }}
                        />
                    </div>
                )}
            </CardContent>

            {/* Formulaire d'édition de la séance */}
            {editingSession && (
                <EditSessionForm
                    session={session}
                    onSave={(updates) => {
                        updateSession(session.id, updates);
                        setEditingSession(false);
                        toast.success("Séance modifiée avec succès !");
                    }}
                    onCancel={() => setEditingSession(false)}
                    open={editingSession}
                    onOpenChange={setEditingSession}
                />
            )}
        </Card>
    );
}

// Formulaire pour éditer une séance (nom + durée)
function EditSessionForm({
    session,
    onSave,
    onCancel,
    open,
    onOpenChange,
}: {
    session: Session;
    onSave: (updates: Partial<Session>) => void;
    onCancel: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    // Utiliser les valeurs de session comme état initial, réinitialisé quand le Sheet s'ouvre
    const [name, setName] = useState(session.name);
    const [duration, setDuration] = useState(session.duration?.toString() || "");

    // Réinitialiser les valeurs quand le Sheet s'ouvre ou que la session change
    useEffect(() => {
        if (open) {
            setName(session.name);
            setDuration(session.duration?.toString() || "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Le nom de la séance est requis");
            return;
        }

        onSave({
            name: name.trim(),
            duration: duration ? parseInt(duration) : undefined,
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Modifier la séance</SheetTitle>
                    <SheetDescription>Modifiez les informations de votre séance.</SheetDescription>
                </SheetHeader>

                <SheetBody className="grid gap-6 py-6">
                    <div className="space-y-3">
                        <Label htmlFor="edit-session-name">Nom de la séance *</Label>
                        <Input
                            id="edit-session-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Entraînement Full Body"
                            className="text-base"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="edit-duration">Durée estimée (minutes)</Label>
                        <Input
                            id="edit-duration"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="Optionnel"
                            className="text-base"
                        />
                    </div>
                </SheetBody>

                <SheetFooter className="flex-col gap-2">
                    <Button onClick={handleSave} className="w-full">
                        Enregistrer les modifications
                    </Button>
                    <Button variant="outline" onClick={onCancel} className="w-full">
                        Annuler
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Composant Sortable pour un bloc
function SortableBlock({
    sessionId,
    block,
    blockIndex,
    sensors,
    onExerciseDragEnd,
    onUpdate,
    onDelete,
}: {
    sessionId: string;
    block: Block;
    blockIndex: number;
    sensors: ReturnType<typeof useSensors>;
    onExerciseDragEnd: (event: DragEndEvent) => void;
    onUpdate: (updates: Partial<Block>) => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
    const { sessions, updateSession } = useSessionStore();
    const session = sessions.find((s) => s.id === sessionId);
    const [editingBlock, setEditingBlock] = useState(false);
    const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleExerciseDragStart = (event: DragStartEvent) => {
        setActiveExerciseId(event.active.id as string);
    };

    const handleExerciseDragEnd = (event: DragEndEvent) => {
        setActiveExerciseId(null);
        onExerciseDragEnd(event);
    };

    return (
        <div ref={setNodeRef} style={style} className="rounded-lg border bg-muted/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <GripVertical className="size-5" />
                    </button>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg">{block.name || `Bloc ${blockIndex + 1}`}</h3>
                        <p className="text-sm text-muted-foreground">
                            {block.repetitions} répétition{block.repetitions > 1 ? "s" : ""} • Pause: {block.pause}s • Entre exos: {block.betweenExos}
                            s
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingBlock(true)}>
                        <Edit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete}>
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Liste des exercices */}
            <div className="space-y-3 pl-8">
                {block.exos.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        <p className="mb-3">Aucun exercice dans ce bloc</p>
                        <CreateExerciseForm
                            onSave={(exercise) => {
                                if (!session) return;
                                const newBlocks = [...session.blocks];
                                newBlocks[blockIndex] = { ...block, exos: [...block.exos, exercise] };
                                updateSession(sessionId, { blocks: newBlocks });
                                toast.success("Exercice ajouté avec succès !");
                            }}
                        />
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                        onDragStart={handleExerciseDragStart}
                        onDragEnd={handleExerciseDragEnd}
                    >
                        <SortableContext items={block.exos.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {block.exos.map((exo) => (
                                    <SortableExercise key={exo.id} sessionId={sessionId} blockIndex={blockIndex} exercise={exo} block={block} />
                                ))}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeExerciseId ? (
                                <div className="flex items-center justify-between rounded-md bg-background p-3 border opacity-50">
                                    <div className="flex items-center gap-3 flex-1">
                                        <GripVertical className="size-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <span className="font-medium">
                                                {block.exos.find((e) => e.id === activeExerciseId)?.name || "Exercice"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
                {block.exos.length > 0 && (
                    <div className="pt-2">
                        <CreateExerciseForm
                            onSave={(exercise) => {
                                if (!session) return;
                                const newBlocks = [...session.blocks];
                                newBlocks[blockIndex] = { ...block, exos: [...block.exos, exercise] };
                                updateSession(sessionId, { blocks: newBlocks });
                                toast.success("Exercice ajouté avec succès !");
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Formulaire d'édition du bloc */}
            {editingBlock && (
                <EditBlockForm
                    block={block}
                    onSave={(updates) => {
                        onUpdate(updates);
                        setEditingBlock(false);
                        toast.success("Bloc modifié avec succès !");
                    }}
                    onCancel={() => setEditingBlock(false)}
                    open={editingBlock}
                    onOpenChange={setEditingBlock}
                />
            )}
        </div>
    );
}

// Composant Sortable pour un exercice
function SortableExercise({ sessionId, blockIndex, exercise, block }: { sessionId: string; blockIndex: number; exercise: Exercise; block: Block }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id });
    const { sessions, updateSession } = useSessionStore();
    const session = sessions.find((s) => s.id === sessionId);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between rounded-md bg-background p-3 border">
            <div className="flex items-center gap-3 flex-1">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <GripVertical className="size-4" />
                </button>
                <div className="flex-1">
                    <span className="font-medium">{exercise.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                        {exercise.type === "reps" ? `${exercise.value} répétition${exercise.value > 1 ? "s" : ""}` : `${exercise.value}s`}
                        {exercise.member && ` (par ${exercise.member})`}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <EditExerciseForm
                    exercise={exercise}
                    onSave={(updates) => {
                        if (!session) return;
                        const newBlocks = [...session.blocks];
                        newBlocks[blockIndex] = {
                            ...block,
                            exos: block.exos.map((e) => (e.id === exercise.id ? { ...e, ...updates } : e)),
                        };
                        updateSession(sessionId, { blocks: newBlocks });
                        toast.success("Exercice modifié avec succès !");
                    }}
                    onDelete={() => {
                        if (!session) return;
                        const newBlocks = [...session.blocks];
                        newBlocks[blockIndex] = {
                            ...block,
                            exos: block.exos.filter((e) => e.id !== exercise.id),
                        };
                        updateSession(sessionId, { blocks: newBlocks });
                        toast.success("Exercice supprimé");
                    }}
                />
            </div>
        </div>
    );
}

// Formulaire pour créer un bloc
function CreateBlockForm({ onSave }: { onSave: (block: Block) => void }) {
    const [name, setName] = useState("");
    const [repetitions, setRepetitions] = useState("1");
    const [pause, setPause] = useState("30");
    const [betweenExos, setBetweenExos] = useState("10");
    const [pauseBeforeNext, setPauseBeforeNext] = useState("30");
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Le nom du bloc est requis");
            return;
        }

        const newBlock: Block = {
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            repetitions: parseInt(repetitions) || 1,
            pause: parseInt(pause) || 0,
            betweenExos: parseInt(betweenExos) || 0,
            pauseBeforeNext: parseInt(pauseBeforeNext) || 0,
            exos: [],
        };

        onSave(newBlock);
        setName("");
        setRepetitions("1");
        setPause("30");
        setBetweenExos("10");
        setPauseBeforeNext("30");
        setIsOpen(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Plus className="size-4 mr-2" />
                    Ajouter un bloc
                </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Nouveau bloc</SheetTitle>
                    <SheetDescription>Créez un nouveau bloc d&apos;exercices pour votre séance.</SheetDescription>
                </SheetHeader>
                <SheetBody className="grid gap-6 py-6">
                    <div className="space-y-3">
                        <Label htmlFor="block-name">Nom du bloc *</Label>
                        <Input
                            id="block-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Échauffement"
                            className="text-base"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label htmlFor="block-reps">Répétitions</Label>
                            <Input
                                id="block-reps"
                                type="number"
                                min="1"
                                value={repetitions}
                                onChange={(e) => setRepetitions(e.target.value)}
                                className="text-base"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="block-pause">Pause (s)</Label>
                            <Input
                                id="block-pause"
                                type="number"
                                min="0"
                                value={pause}
                                onChange={(e) => setPause(e.target.value)}
                                className="text-base"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label htmlFor="block-between">Entre exos (s)</Label>
                            <Input
                                id="block-between"
                                type="number"
                                min="0"
                                value={betweenExos}
                                onChange={(e) => setBetweenExos(e.target.value)}
                                className="text-base"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="block-pause-before-next">Avant prochain bloc (s)</Label>
                            <Input
                                id="block-pause-before-next"
                                type="number"
                                min="0"
                                value={pauseBeforeNext}
                                onChange={(e) => setPauseBeforeNext(e.target.value)}
                                className="text-base"
                            />
                        </div>
                    </div>
                </SheetBody>

                <SheetFooter className="flex-col gap-2">
                    <Button onClick={handleSave} className="w-full">
                        Créer le bloc
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                        Annuler
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Formulaire pour éditer un bloc
function EditBlockForm({
    block,
    onSave,
    onCancel,
    open,
    onOpenChange,
}: {
    block: Block;
    onSave: (updates: Partial<Block>) => void;
    onCancel: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    // Utiliser les valeurs du bloc comme état initial, réinitialisé quand le Sheet s'ouvre
    const [name, setName] = useState(block.name);
    const [repetitions, setRepetitions] = useState(block.repetitions.toString());
    const [pause, setPause] = useState(block.pause.toString());
    const [betweenExos, setBetweenExos] = useState(block.betweenExos.toString());
    const [pauseBeforeNext, setPauseBeforeNext] = useState((block.pauseBeforeNext ?? 0).toString());

    // Réinitialiser les valeurs quand le Sheet s'ouvre
    useEffect(() => {
        if (open) {
            setName(block.name);
            setRepetitions(block.repetitions.toString());
            setPause(block.pause.toString());
            setBetweenExos(block.betweenExos.toString());
            setPauseBeforeNext((block.pauseBeforeNext ?? 0).toString());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Le nom du bloc est requis");
            return;
        }

        onSave({
            name: name.trim(),
            repetitions: parseInt(repetitions) || 1,
            pause: parseInt(pause) || 0,
            betweenExos: parseInt(betweenExos) || 0,
            pauseBeforeNext: parseInt(pauseBeforeNext) || 0,
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Modifier le bloc</SheetTitle>
                    <SheetDescription>Modifiez les informations de votre bloc.</SheetDescription>
                </SheetHeader>

                <SheetBody className="grid gap-6 py-6">
                    <div className="space-y-3">
                        <Label htmlFor="edit-block-name">Nom du bloc *</Label>
                        <Input
                            id="edit-block-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Échauffement"
                            className="text-base"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label htmlFor="edit-block-reps">Répétitions</Label>
                            <Input
                                id="edit-block-reps"
                                type="number"
                                min="1"
                                value={repetitions}
                                onChange={(e) => setRepetitions(e.target.value)}
                                className="text-base"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="edit-block-pause">Pause (s)</Label>
                            <Input
                                id="edit-block-pause"
                                type="number"
                                min="0"
                                value={pause}
                                onChange={(e) => setPause(e.target.value)}
                                className="text-base"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label htmlFor="edit-block-between">Entre exos (s)</Label>
                            <Input
                                id="edit-block-between"
                                type="number"
                                min="0"
                                value={betweenExos}
                                onChange={(e) => setBetweenExos(e.target.value)}
                                className="text-base"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="edit-block-pause-before-next">Avant prochain bloc (s)</Label>
                            <Input
                                id="edit-block-pause-before-next"
                                type="number"
                                min="0"
                                value={pauseBeforeNext}
                                onChange={(e) => setPauseBeforeNext(e.target.value)}
                                className="text-base"
                            />
                        </div>
                    </div>
                </SheetBody>

                <SheetFooter className="flex-col gap-2">
                    <Button onClick={handleSave} className="w-full">
                        Enregistrer les modifications
                    </Button>
                    <Button variant="outline" onClick={onCancel} className="w-full">
                        Annuler
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Formulaire pour créer un exercice
function CreateExerciseForm({ onSave }: { onSave: (exercise: Exercise) => void }) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"reps" | "duration">("reps");
    const [value, setValue] = useState("10");
    const [member, setMember] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Le nom de l'exercice est requis");
            return;
        }

        const newExercise: Exercise = {
            id: `exo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            type,
            value: parseInt(value) || 1,
            member: member.trim() || undefined,
        };

        onSave(newExercise);
        setName("");
        setType("reps");
        setValue("10");
        setMember("");
        setIsOpen(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="size-4 mr-2" />
                    Ajouter un exercice
                </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Nouvel exercice</SheetTitle>
                    <SheetDescription>Ajoutez un nouvel exercice à votre bloc.</SheetDescription>
                </SheetHeader>

                <SheetBody className="grid gap-6 py-6">
                    <div className="space-y-3">
                        <Label htmlFor="exo-name">Nom de l&apos;exercice *</Label>
                        <Input id="exo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pompes" className="text-base" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label htmlFor="exo-type">Type</Label>
                            <div className="flex rounded-md border bg-muted p-1">
                                <button
                                    type="button"
                                    onClick={() => setType("reps")}
                                    className={`flex-1 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
                                        type === "reps" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                    }`}
                                >
                                    Répétitions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("duration")}
                                    className={`flex-1 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
                                        type === "duration" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                    }`}
                                >
                                    Durée
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="exo-value">{type === "reps" ? "Nombre" : "Durée (s)"}</Label>
                            <Input
                                id="exo-value"
                                type="number"
                                min="1"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="text-base"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="exo-member">Partie du corps (optionnel)</Label>
                        <Input
                            id="exo-member"
                            value={member}
                            onChange={(e) => setMember(e.target.value)}
                            placeholder="Ex: jambes, côtés, bras..."
                            className="text-base"
                        />
                    </div>
                </SheetBody>

                <SheetFooter className="flex-col gap-2">
                    <Button onClick={handleSave} className="w-full">
                        Ajouter l&apos;exercice
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                        Annuler
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Formulaire pour éditer un exercice
function EditExerciseForm({
    exercise,
    onSave,
    onDelete,
}: {
    exercise: Exercise;
    onSave: (updates: Partial<Exercise>) => void;
    onDelete: () => void;
}) {
    // Utiliser les valeurs de l'exercice comme état initial, réinitialisé quand le Sheet s'ouvre
    const [name, setName] = useState(exercise.name);
    const [type, setType] = useState<"reps" | "duration">(exercise.type);
    const [value, setValue] = useState(exercise.value.toString());
    const [member, setMember] = useState(exercise.member || "");
    const [isOpen, setIsOpen] = useState(false);

    // Réinitialiser les valeurs quand le Sheet s'ouvre
    useEffect(() => {
        if (isOpen) {
            setName(exercise.name);
            setType(exercise.type);
            setValue(exercise.value.toString());
            setMember(exercise.member || "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Le nom de l'exercice est requis");
            return;
        }

        onSave({
            name: name.trim(),
            type,
            value: parseInt(value) || 1,
            member: member.trim() || undefined,
        });
        setIsOpen(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                    <Edit className="size-3" />
                </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Modifier l&apos;exercice</SheetTitle>
                    <SheetDescription>Modifiez les informations de votre exercice.</SheetDescription>
                </SheetHeader>

                <SheetBody className="grid gap-6 py-6">
                    <div className="space-y-3">
                        <Label htmlFor="edit-exo-name">Nom de l&apos;exercice *</Label>
                        <Input
                            id="edit-exo-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Pompes"
                            className="text-base"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label htmlFor="edit-exo-type">Type</Label>
                            <div className="flex rounded-md border bg-muted p-1">
                                <button
                                    type="button"
                                    onClick={() => setType("reps")}
                                    className={`flex-1 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
                                        type === "reps" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                    }`}
                                >
                                    Répétitions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("duration")}
                                    className={`flex-1 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
                                        type === "duration" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                    }`}
                                >
                                    Durée
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="edit-exo-value">{type === "reps" ? "Nombre" : "Durée (s)"}</Label>
                            <Input
                                id="edit-exo-value"
                                type="number"
                                min="1"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="text-base"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="edit-exo-member">Partie du corps (optionnel)</Label>
                        <Input
                            id="edit-exo-member"
                            value={member}
                            onChange={(e) => setMember(e.target.value)}
                            placeholder="Ex: jambes, côtés, bras..."
                            className="text-base"
                        />
                    </div>
                </SheetBody>

                <SheetFooter className="flex-col gap-2">
                    <Button onClick={handleSave} className="w-full">
                        Enregistrer les modifications
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            onDelete();
                            setIsOpen(false);
                        }}
                        className="w-full"
                    >
                        <Trash2 className="size-4 mr-2" />
                        Supprimer l&apos;exercice
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                        Annuler
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
