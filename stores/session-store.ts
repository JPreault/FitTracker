import { Session } from "@/types/session";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
    sessions: Session[];
    addSession: (session: Omit<Session, "id" | "createdAt" | "updatedAt">) => void;
    updateSession: (id: string, session: Partial<Session>) => void;
    deleteSession: (id: string) => void;
    exportSessions: () => string;
    importSessions: (sessionsToImport: Session[]) => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set, get) => ({
            sessions: [],
            addSession: (sessionData) => {
                const now = Date.now();
                const newSession: Session = {
                    ...sessionData,
                    id: `session-${now}-${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    sessions: [...state.sessions, newSession],
                }));
            },
            updateSession: (id, updates) => {
                set((state) => ({
                    sessions: state.sessions.map((session) =>
                        session.id === id
                            ? { ...session, ...updates, updatedAt: Date.now() }
                            : session
                    ),
                }));
            },
            deleteSession: (id) => {
                set((state) => ({
                    sessions: state.sessions.filter((session) => session.id !== id),
                }));
            },
            exportSessions: () => {
                const sessions = get().sessions;
                return JSON.stringify(sessions, null, 2);
            },
            importSessions: (sessionsToImport) => {
                const now = Date.now();
                // Générer de nouveaux IDs et timestamps pour éviter les conflits
                const importedSessions: Session[] = sessionsToImport.map((session) => ({
                    ...session,
                    id: `session-${now}-${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: session.createdAt || now,
                    updatedAt: now,
                }));
                set((state) => ({
                    sessions: [...state.sessions, ...importedSessions],
                }));
            },
        }),
        {
            name: "session-storage",
        }
    )
);

