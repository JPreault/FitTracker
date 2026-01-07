import { useCallback, useEffect, useRef, useState } from "react";

type SpeechProvider = "native" | "azure" | "google";

interface SpeechOptions {
    provider?: SpeechProvider;
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    azureKey?: string;
    azureRegion?: string;
    googleApiKey?: string;
    // Limites pour Google Cloud TTS (en caractères)
    googleLimit?: number; // Limite personnalisée (par défaut 3.5M pour laisser une marge)
    googleVoiceType?: "standard" | "neural"; // Type de voix (neural = 1M, standard = 4M)
}

interface QuotaUsage {
    charactersUsed: number;
    monthStart: string; // Format YYYY-MM
    lastReset: number; // Timestamp
}

// Constantes pour les limites Google Cloud TTS
const GOOGLE_STANDARD_LIMIT = 4_000_000; // 4 millions de caractères/mois
const GOOGLE_NEURAL_LIMIT = 1_000_000; // 1 million de caractères/mois
const DEFAULT_SAFETY_LIMIT = 3_500_000; // Limite de sécurité pour éviter de dépasser

const STORAGE_KEY = "google_tts_quota";

/**
 * Hook personnalisé pour la synthèse vocale avec support de plusieurs providers
 * 
 * Solutions gratuites disponibles :
 * 1. Native (Web Speech API) - Gratuit, mais qualité variable selon le navigateur
 * 2. Azure Cognitive Services - Gratuit jusqu'à 500 000 caractères/mois
 * 3. Google Cloud TTS - Gratuit jusqu'à 4 millions de caractères/mois
 */
export function useSpeechSynthesis(options: SpeechOptions = {}) {
    const {
        provider = "native",
        voice,
        rate = 1.0,
        pitch = 1.0,
        volume = 1.0,
        azureKey,
        azureRegion,
        googleApiKey,
        googleLimit,
        googleVoiceType = "neural", // Par défaut neural (meilleure qualité mais limite plus basse)
    } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [bestFrenchVoice, setBestFrenchVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [quotaUsage, setQuotaUsage] = useState<QuotaUsage | null>(null);
    const [quotaExceeded, setQuotaExceeded] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Calculer la limite effective pour Google
    const getGoogleLimit = useCallback(() => {
        if (googleLimit) return googleLimit;
        // Utiliser la limite selon le type de voix, avec une marge de sécurité
        const baseLimit = googleVoiceType === "neural" ? GOOGLE_NEURAL_LIMIT : GOOGLE_STANDARD_LIMIT;
        // Réduire de 10% pour laisser une marge de sécurité
        return Math.floor(baseLimit * 0.9);
    }, [googleLimit, googleVoiceType]);

    // Gestion du quota Google Cloud TTS
    const getCurrentMonth = useCallback(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }, []);

    const loadQuotaUsage = useCallback((): QuotaUsage | null => {
        if (typeof window === "undefined") return null;
        
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            
            const quota: QuotaUsage = JSON.parse(stored);
            const currentMonth = getCurrentMonth();
            
            // Si on est dans un nouveau mois, réinitialiser le quota
            if (quota.monthStart !== currentMonth) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            
            return quota;
        } catch (error) {
            console.error("Erreur lors du chargement du quota:", error);
            return null;
        }
    }, [getCurrentMonth]);

    const saveQuotaUsage = useCallback((quota: QuotaUsage) => {
        if (typeof window === "undefined") return;
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(quota));
            setQuotaUsage(quota);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde du quota:", error);
        }
    }, []);

    // Note: Le quota Google est maintenant géré côté serveur via /api/tts/google
    // Les fonctions addToQuota et checkQuota ont été supprimées car le quota
    // est vérifié et mis à jour côté serveur pour éviter les contournements

    // Charger le quota depuis le serveur au démarrage (pour Google)
    const loadQuotaFromServer = useCallback(async () => {
        if (provider !== "google") return;

        try {
            const response = await fetch("/api/tts/google/quota");
            if (response.ok) {
                const data = await response.json();
                if (data.quota) {
                    const quota: QuotaUsage = {
                        charactersUsed: data.quota.charactersUsed,
                        monthStart: data.quota.monthStart,
                        lastReset: data.quota.lastReset || Date.now(),
                    };
                    setQuotaUsage(quota);
                    setQuotaExceeded(quota.charactersUsed >= (data.limit || getGoogleLimit()));
                    // Synchroniser avec le localStorage pour l'affichage
                    saveQuotaUsage(quota);
                }
            }
        } catch (error) {
            console.error("Erreur lors du chargement du quota depuis le serveur:", error);
            // Fallback vers le localStorage
            const quota = loadQuotaUsage();
            if (quota) {
                setQuotaUsage(quota);
                setQuotaExceeded(quota.charactersUsed >= getGoogleLimit());
            }
        }
    }, [provider, getGoogleLimit, saveQuotaUsage, loadQuotaUsage]);

    // Charger le quota au démarrage
    useEffect(() => {
        if (provider === "google") {
            loadQuotaFromServer();
        } else {
            // Pour les autres providers, charger depuis localStorage si disponible
            const quota = loadQuotaUsage();
            if (quota) {
                setQuotaUsage(quota);
            }
        }
    }, [provider, loadQuotaFromServer, loadQuotaUsage]);

    // Charger les voix disponibles pour l'API native
    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            setIsAvailable(false);
            return;
        }

        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);

            // Trouver la meilleure voix française disponible
            // Priorité : voix neurales > voix premium > voix standard
            const frenchVoices = voices.filter((v) => v.lang.startsWith("fr"));
            
            if (frenchVoices.length > 0) {
                // Chercher une voix neurale (meilleure qualité)
                let bestVoice = frenchVoices.find(
                    (v) => v.name.toLowerCase().includes("neural") || v.name.toLowerCase().includes("premium")
                );
                
                // Sinon, chercher une voix avec un nom qui suggère une meilleure qualité
                if (!bestVoice) {
                    bestVoice = frenchVoices.find(
                        (v) => 
                            v.name.toLowerCase().includes("thomas") ||
                            v.name.toLowerCase().includes("denise") ||
                            v.name.toLowerCase().includes("thierry") ||
                            v.name.toLowerCase().includes("claire")
                    );
                }
                
                // Sinon, prendre la première voix française disponible
                if (!bestVoice) {
                    bestVoice = frenchVoices[0];
                }
                
                setBestFrenchVoice(bestVoice);
            }

            setIsAvailable(true);
        };

        loadVoices();
        
        // Certains navigateurs chargent les voix de manière asynchrone
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // Fonction pour utiliser l'API native (améliorée)
    const speakNative = useCallback(
        (text: string) => {
            if (typeof window === "undefined" || !("speechSynthesis" in window)) {
                console.warn("Web Speech API non disponible");
                return;
            }

            // Annuler toute annonce en cours
            window.speechSynthesis.cancel();

            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = "fr-FR";
                utterance.rate = rate;
                utterance.pitch = pitch;
                utterance.volume = volume;

                // Utiliser la meilleure voix française disponible
                if (bestFrenchVoice) {
                    utterance.voice = bestFrenchVoice;
                } else if (voice) {
                    // Utiliser la voix spécifiée si disponible
                    const selectedVoice = availableVoices.find((v) => v.name === voice);
                    if (selectedVoice) {
                        utterance.voice = selectedVoice;
                    }
                }

                utterance.onstart = () => setIsSpeaking(true);
                utterance.onend = () => setIsSpeaking(false);
                utterance.onerror = () => setIsSpeaking(false);

                utteranceRef.current = utterance;
                window.speechSynthesis.speak(utterance);
            }, 100);
        },
        [bestFrenchVoice, voice, availableVoices, rate, pitch, volume]
    );

    // Fonction pour utiliser Azure Cognitive Services
    const speakAzure = useCallback(
        async (text: string) => {
            if (!azureKey || !azureRegion) {
                console.warn("Clés Azure non configurées, utilisation de l'API native");
                speakNative(text);
                return;
            }

            try {
                setIsSpeaking(true);

                // Obtenir un token d'accès (nécessaire pour l'API Azure)
                const tokenResponse = await fetch(
                    `https://${azureRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
                    {
                        method: "POST",
                        headers: {
                            "Ocp-Apim-Subscription-Key": azureKey,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    }
                );

                if (!tokenResponse.ok) {
                    throw new Error("Erreur lors de l'obtention du token Azure");
                }

                const accessToken = await tokenResponse.text();

                // Synthétiser la voix avec SSML pour un meilleur contrôle
                const ssml = `
                    <speak version="1.0" xml:lang="fr-FR">
                        <voice xml:lang="fr-FR" xml:gender="Female" name="fr-FR-DeniseNeural">
                            <prosody rate="${rate}" pitch="${pitch}%">
                                ${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
                            </prosody>
                        </voice>
                    </speak>
                `;

                const speechResponse = await fetch(
                    `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/ssml+xml",
                            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                        },
                        body: ssml,
                    }
                );

                if (!speechResponse.ok) {
                    const errorText = await speechResponse.text();
                    throw new Error(`Erreur Azure TTS: ${errorText}`);
                }

                const audioBlob = await speechResponse.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                audio.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onerror = (e) => {
                    console.error("Erreur lecture audio Azure:", e);
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                };

                await audio.play();
            } catch (error) {
                console.error("Erreur Azure TTS:", error);
                setIsSpeaking(false);
                // Fallback vers l'API native
                speakNative(text);
            }
        },
        [azureKey, azureRegion, rate, pitch, speakNative]
    );

    // Fonction pour utiliser Google Cloud TTS via l'API route côté serveur
    // IMPORTANT: La protection du quota se fait côté serveur pour éviter les contournements
    const speakGoogle = useCallback(
        async (text: string) => {
            try {
                setIsSpeaking(true);

                // Appeler l'API route côté serveur qui gère le quota global
                const response = await fetch("/api/tts/google", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text,
                        voiceType: googleVoiceType,
                        rate,
                        pitch,
                        volume,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    
                    // Si le quota est dépassé, basculer vers l'API native
                    if (response.status === 429 || errorData.error === "QUOTA_EXCEEDED") {
                        console.warn(
                            `🚫 Limite Google TTS atteinte côté serveur: ${errorData.message}. Basculement vers l'API native.`
                        );
                        // Mettre à jour le quota local pour l'affichage
                        if (errorData.quota) {
                            const currentMonth = getCurrentMonth();
                            const quota: QuotaUsage = {
                                charactersUsed: errorData.quota.charactersUsed,
                                monthStart: errorData.quota.monthStart || currentMonth,
                                lastReset: errorData.quota.lastReset || Date.now(),
                            };
                            saveQuotaUsage(quota);
                            setQuotaUsage(quota);
                            setQuotaExceeded(true);
                        }
                        speakNative(text);
                        return;
                    }

                    throw new Error(`Erreur API TTS: ${errorData.message || "Erreur inconnue"}`);
                }

                const data = await response.json();
                const audioData = data.audioContent;

                // Mettre à jour le quota local avec les données du serveur
                if (data.quota) {
                    const quota: QuotaUsage = {
                        charactersUsed: data.quota.charactersUsed,
                        monthStart: data.quota.monthStart,
                        lastReset: data.quota.lastReset || Date.now(),
                    };
                    saveQuotaUsage(quota);
                    setQuotaUsage(quota);
                    setQuotaExceeded(data.quota.charactersUsed >= (data.limit || getGoogleLimit()));
                }

                // Décoder l'audio base64
                const audioBlob = new Blob(
                    [Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))],
                    { type: "audio/mp3" }
                );

                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                audio.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onerror = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                };

                await audio.play();
            } catch (error) {
                console.error("Erreur Google TTS:", error);
                setIsSpeaking(false);
                // Fallback vers l'API native
                speakNative(text);
            }
        },
        [googleVoiceType, rate, pitch, volume, speakNative, getGoogleLimit, saveQuotaUsage, getCurrentMonth]
    );

    // Fonction principale de synthèse vocale
    const speak = useCallback(
        (text: string) => {
            switch (provider) {
                case "azure":
                    speakAzure(text);
                    break;
                case "google":
                    speakGoogle(text);
                    break;
                case "native":
                default:
                    speakNative(text);
                    break;
            }
        },
        [provider, speakNative, speakAzure, speakGoogle]
    );

    // Fonction pour arrêter la synthèse
    const stop = useCallback(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    }, []);

    // Fonction pour réinitialiser le quota (utile pour les tests)
    const resetQuota = useCallback(() => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
            setQuotaUsage(null);
            setQuotaExceeded(false);
        }
    }, []);

    return {
        speak,
        stop,
        isSpeaking,
        isAvailable,
        availableVoices,
        bestFrenchVoice: bestFrenchVoice?.name || null,
        // Informations sur le quota Google
        quotaUsage: provider === "google" ? quotaUsage : null,
        quotaExceeded: provider === "google" ? quotaExceeded : false,
        quotaLimit: provider === "google" ? getGoogleLimit() : null,
        resetQuota: provider === "google" ? resetQuota : undefined,
    };
}

