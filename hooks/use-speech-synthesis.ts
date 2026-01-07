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
}

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
    } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [bestFrenchVoice, setBestFrenchVoice] = useState<SpeechSynthesisVoice | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

    // Fonction pour utiliser Google Cloud TTS
    const speakGoogle = useCallback(
        async (text: string) => {
            if (!googleApiKey) {
                console.warn("Clé API Google non configurée, utilisation de l'API native");
                speakNative(text);
                return;
            }

            try {
                setIsSpeaking(true);

                const response = await fetch(
                    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            input: { text },
                            voice: {
                                languageCode: "fr-FR",
                                name: "fr-FR-Neural2-C", // Voix neurale française
                                ssmlGender: "FEMALE",
                            },
                            audioConfig: {
                                audioEncoding: "MP3",
                                speakingRate: rate,
                                pitch: pitch,
                                volumeGainDb: (volume - 1) * 6, // Convertir volume 0-1 en dB
                            },
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Erreur lors de la synthèse vocale Google");
                }

                const data = await response.json();
                const audioData = data.audioContent;

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
        [googleApiKey, rate, pitch, volume, speakNative]
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

    return {
        speak,
        stop,
        isSpeaking,
        isAvailable,
        availableVoices,
        bestFrenchVoice: bestFrenchVoice?.name || null,
    };
}

