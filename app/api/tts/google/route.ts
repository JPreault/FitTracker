import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Configuration des limites Google Cloud TTS
const GOOGLE_STANDARD_LIMIT = 4_000_000; // 4 millions de caractères/mois
const GOOGLE_NEURAL_LIMIT = 1_000_000; // 1 million de caractères/mois
const DEFAULT_SAFETY_LIMIT = 900_000; // Limite de sécurité pour neural (90%)

interface QuotaData {
    charactersUsed: number;
    monthStart: string; // Format YYYY-MM
    lastReset: number; // Timestamp
}

const QUOTA_FILE = path.join(process.cwd(), ".quota", "google-tts.json");

// Obtenir le mois actuel
function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Charger le quota depuis le fichier
async function loadQuota(): Promise<QuotaData | null> {
    try {
        const data = await fs.readFile(QUOTA_FILE, "utf-8");
        const quota: QuotaData = JSON.parse(data);
        const currentMonth = getCurrentMonth();

        // Si on est dans un nouveau mois, réinitialiser
        if (quota.monthStart !== currentMonth) {
            return null;
        }

        return quota;
    } catch (error) {
        // Fichier n'existe pas ou erreur de lecture
        return null;
    }
}

// Sauvegarder le quota
async function saveQuota(quota: QuotaData): Promise<void> {
    try {
        const dir = path.dirname(QUOTA_FILE);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(QUOTA_FILE, JSON.stringify(quota, null, 2), "utf-8");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du quota:", error);
        throw error;
    }
}

// Vérifier et mettre à jour le quota
async function checkAndUpdateQuota(
    textLength: number,
    voiceType: "neural" | "standard" = "neural"
): Promise<{ allowed: boolean; quota: QuotaData; limit: number }> {
    const currentMonth = getCurrentMonth();
    let quota = await loadQuota();

    // Initialiser le quota si nécessaire
    if (!quota || quota.monthStart !== currentMonth) {
        quota = {
            charactersUsed: 0,
            monthStart: currentMonth,
            lastReset: Date.now(),
        };
    }

    // Déterminer la limite selon le type de voix
    const baseLimit = voiceType === "neural" ? GOOGLE_NEURAL_LIMIT : GOOGLE_STANDARD_LIMIT;
    const safetyLimit = Math.floor(baseLimit * 0.9); // 90% pour laisser une marge

    // Vérifier si on peut faire l'appel
    if (quota.charactersUsed + textLength > safetyLimit) {
        return {
            allowed: false,
            quota,
            limit: safetyLimit,
        };
    }

    // Mettre à jour le quota
    quota.charactersUsed += textLength;
    await saveQuota(quota);

    return {
        allowed: true,
        quota,
        limit: safetyLimit,
    };
}

// POST /api/tts/google
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voiceType = "neural", rate = 1.0, pitch = 1.0, volume = 1.0 } = body;

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Le texte est requis" }, { status: 400 });
        }

        const googleApiKey = process.env.GOOGLE_TTS_API_KEY;
        if (!googleApiKey) {
            return NextResponse.json(
                { error: "Clé API Google non configurée côté serveur" },
                { status: 500 }
            );
        }

        // Vérifier le quota AVANT de faire l'appel API
        const textLength = text.length;
        const quotaCheck = await checkAndUpdateQuota(textLength, voiceType);

        if (!quotaCheck.allowed) {
            return NextResponse.json(
                {
                    error: "QUOTA_EXCEEDED",
                    message: `Limite de quota atteinte: ${quotaCheck.quota.charactersUsed} / ${quotaCheck.limit} caractères`,
                    quota: quotaCheck.quota,
                    limit: quotaCheck.limit,
                },
                { status: 429 } // Too Many Requests
            );
        }

        // Faire l'appel à Google Cloud TTS
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
                        name: voiceType === "neural" ? "fr-FR-Neural2-C" : "fr-FR-Wavenet-C",
                        ssmlGender: "FEMALE",
                    },
                    audioConfig: {
                        audioEncoding: "MP3",
                        speakingRate: rate,
                        pitch: pitch,
                        volumeGainDb: (volume - 1) * 6,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Erreur Google TTS API:", errorData);
            return NextResponse.json(
                { error: "Erreur lors de la synthèse vocale Google", details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Retourner l'audio et les informations de quota
        return NextResponse.json({
            audioContent: data.audioContent,
            quota: quotaCheck.quota,
            limit: quotaCheck.limit,
        });
    } catch (error) {
        console.error("Erreur dans /api/tts/google:", error);
        return NextResponse.json(
            { error: "Erreur serveur", message: error instanceof Error ? error.message : "Erreur inconnue" },
            { status: 500 }
        );
    }
}

// GET /api/tts/google/quota - Pour consulter le quota actuel
export async function GET() {
    try {
        const quota = await loadQuota();
        const voiceType = "neural"; // Par défaut, ou récupérer depuis la config
        const baseLimit = GOOGLE_NEURAL_LIMIT;
        const safetyLimit = Math.floor(baseLimit * 0.9);

        return NextResponse.json({
            quota: quota || {
                charactersUsed: 0,
                monthStart: getCurrentMonth(),
                lastReset: Date.now(),
            },
            limit: safetyLimit,
            baseLimit,
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Erreur lors de la récupération du quota" },
            { status: 500 }
        );
    }
}

