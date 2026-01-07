# Guide de Configuration de la Synthèse Vocale

Ce guide explique comment configurer différentes solutions de synthèse vocale gratuites pour améliorer la qualité des voix en français.

## Solutions Disponibles

### 1. API Native (Web Speech API) - Par défaut ✅

**Avantages :**

-   ✅ Gratuit et sans configuration
-   ✅ Fonctionne immédiatement
-   ✅ Pas de limite d'utilisation
-   ✅ Aucune clé API nécessaire

**Inconvénients :**

-   ⚠️ Qualité variable selon le navigateur
-   ⚠️ Voix parfois robotiques

**Configuration :**
Aucune configuration nécessaire. Le système sélectionne automatiquement la meilleure voix française disponible sur votre navigateur.

---

### 2. Azure Cognitive Services Speech - Recommandé 🎯

**Avantages :**

-   ✅ **Gratuit jusqu'à 500 000 caractères/mois**
-   ✅ Voix neurales très réalistes (DeniseNeural, ThierryNeural, etc.)
-   ✅ Qualité professionnelle
-   ✅ Support excellent du français

**Inconvénients :**

-   ⚠️ Nécessite une clé API (gratuite)
-   ⚠️ Limite de 500k caractères/mois (généralement suffisant)

**Configuration :**

1. **Créer un compte Azure (gratuit) :**

    - Allez sur [portal.azure.com](https://portal.azure.com)
    - Créez un compte gratuit (crédit de 200$ offert)

2. **Créer une ressource Speech :**

    - Dans le portail Azure, créez une nouvelle ressource "Speech"
    - Choisissez le niveau "Free F0" (gratuit)
    - Notez votre **clé** et votre **région** (ex: "francecentral", "westeurope")

3. **Configurer dans votre application :**

    Créez un fichier `.env.local` à la racine du projet :

    ```env
    NEXT_PUBLIC_AZURE_SPEECH_KEY=votre_cle_azure
    NEXT_PUBLIC_AZURE_SPEECH_REGION=francecentral
    ```

4. **Activer Azure dans le code :**

    Dans `app/workout/run/page.tsx`, modifiez le hook :

    ```typescript
    const { speak, stop } = useSpeechSynthesis({
        provider: "azure",
        azureKey: process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
        azureRegion: process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION,
    });
    ```

**Voix disponibles en français :**

-   `fr-FR-DeniseNeural` (Femme, voix douce)
-   `fr-FR-HenriNeural` (Homme, voix claire)
-   `fr-FR-ThierryNeural` (Homme, voix professionnelle)
-   `fr-FR-EliseNeural` (Femme, voix expressive)

---

### 3. Google Cloud Text-to-Speech 🛡️

**Avantages :**

-   ✅ **Gratuit jusqu'à 4 millions de caractères/mois** (voix standard)
-   ✅ **Gratuit jusqu'à 1 million de caractères/mois** (voix neurales)
-   ✅ Voix neurales de très haute qualité
-   ✅ Très bon support du français
-   ✅ **Système de quota automatique intégré** - Blocage automatique pour éviter les dépassements

**Inconvénients :**

-   ⚠️ Nécessite une clé API
-   ⚠️ Configuration plus complexe

**Limites gratuites :**

-   **Voix Standard** : 4 millions de caractères/mois
-   **Voix Neurales** : 1 million de caractères/mois (recommandé pour la qualité)

**Système de protection automatique (CÔTÉ SERVEUR) :**
Le système inclut un **système de quota automatique côté serveur** qui :

-   ✅ **Protection réelle** : Le quota est géré côté serveur via `/api/tts/google` pour éviter les contournements
-   ✅ Compte automatiquement les caractères utilisés chaque mois (tous utilisateurs confondus)
-   ✅ Bloque les appels API si la limite globale est atteinte
-   ✅ Bascule automatiquement vers l'API native si la limite est atteinte
-   ✅ Réinitialise automatiquement chaque mois
-   ✅ Stocke le quota dans un fichier `.quota/google-tts.json` côté serveur
-   ✅ Le localStorage côté client est uniquement informatif (synchronisé avec le serveur)

**⚠️ IMPORTANT - Architecture de sécurité :**

Le système utilise une **architecture hybride** :

1. **Côté serveur** (`/app/api/tts/google/route.ts`) :

    - Vérifie le quota **AVANT** chaque appel à Google Cloud TTS
    - Met à jour le quota global (tous utilisateurs)
    - Bloque les appels si la limite est atteinte
    - **C'est la seule vraie protection** contre les dépassements

2. **Côté client** (`hooks/use-speech-synthesis.ts`) :
    - Affiche l'utilisation actuelle (synchronisée avec le serveur)
    - Permet de voir le quota en temps réel
    - Bascule automatiquement vers l'API native si le serveur refuse l'appel
    - **Le localStorage est uniquement informatif**, pas une protection réelle

**Configuration :**

1. **Créer un projet Google Cloud :**

    - Allez sur [console.cloud.google.com](https://console.cloud.google.com)
    - Créez un nouveau projet

2. **Activer l'API Text-to-Speech :**

    - Activez l'API "Cloud Text-to-Speech API"
    - Créez une clé API dans "Identifiants"

3. **Configurer dans votre application :**

    **IMPORTANT** : La clé API doit être côté serveur, pas côté client !

    Dans `.env.local` (ou variables d'environnement du serveur) :

    ```env
    # Clé API Google (côté serveur uniquement - ne pas exposer au client)
    GOOGLE_TTS_API_KEY=votre_cle_google
    ```

    ⚠️ **Ne pas utiliser** `NEXT_PUBLIC_GOOGLE_TTS_API_KEY` car cela exposerait la clé au client.

4. **Activer Google dans le code :**
    ```typescript
    const { speak, stop, quotaUsage, quotaExceeded, quotaLimit } = useSpeechSynthesis({
        provider: "google",
        googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY,
        googleVoiceType: "neural", // ou "standard" pour plus de caractères
        googleLimit: 900000, // Optionnel : limite personnalisée (par défaut 90% de la limite)
    });
    ```

**Options de configuration :**

-   `googleVoiceType`: `"neural"` (par défaut, meilleure qualité) ou `"standard"` (plus de caractères)
-   `googleLimit`: Limite personnalisée en caractères (par défaut 90% de la limite pour laisser une marge)

**Surveillance du quota :**
Le hook retourne des informations sur le quota :

```typescript
const {
    speak,
    quotaUsage,      // { charactersUsed: 50000, monthStart: "2024-01", lastReset: ... }
    quotaExceeded,   // true si la limite est atteinte
    quotaLimit,      // Limite configurée (ex: 900000)
    resetQuota       // Fonction pour réinitialiser le quota (utile pour les tests)
} = useSpeechSynthesis({ provider: "google", ... });
```

---

## Comparaison des Solutions

| Solution   | Qualité    | Gratuit       | Limite                      | Protection Quota   | Configuration |
| ---------- | ---------- | ------------- | --------------------------- | ------------------ | ------------- |
| **Native** | ⭐⭐       | ✅ Illimité   | Aucune                      | ❌ Non applicable  | Aucune        |
| **Azure**  | ⭐⭐⭐⭐⭐ | ✅ 500k/mois  | 500k caractères             | ⚠️ Manuelle        | Facile        |
| **Google** | ⭐⭐⭐⭐⭐ | ✅ 1M-4M/mois | 1M (neural) / 4M (standard) | ✅ **Automatique** | Moyenne       |

## Recommandation

Pour la meilleure expérience gratuite, nous recommandons **Azure Cognitive Services** :

-   Qualité professionnelle
-   Limite généreuse (500k caractères/mois)
-   Configuration simple
-   Voix neurales très réalistes en français

## Utilisation

Le hook `useSpeechSynthesis` est déjà intégré dans votre application. Il suffit de changer le `provider` dans le code pour utiliser une autre solution.

```typescript
// API Native (par défaut)
const { speak } = useSpeechSynthesis({ provider: "native" });

// Azure (recommandé)
const { speak } = useSpeechSynthesis({
    provider: "azure",
    azureKey: process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
    azureRegion: process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION,
});

// Google Cloud
const { speak } = useSpeechSynthesis({
    provider: "google",
    googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY,
});
```

## Notes Importantes

-   Les clés API doivent être dans des variables d'environnement pour la sécurité
-   Ne commitez jamais vos clés API dans le code
-   Le fichier `.env.local` est déjà dans `.gitignore`
-   Azure et Google offrent un fallback automatique vers l'API native en cas d'erreur
-   **Google Cloud TTS** : Le système de quota bloque automatiquement les appels si la limite est atteinte pour éviter les frais
-   Le quota Google se réinitialise automatiquement chaque mois
-   Vous pouvez surveiller votre utilisation via les valeurs retournées par le hook (`quotaUsage`, `quotaExceeded`, `quotaLimit`)

## Protection contre les dépassements (Google Cloud)

### Architecture de sécurité côté serveur

Le système utilise une **protection côté serveur** pour éviter les contournements :

1. **API Route** (`/app/api/tts/google/route.ts`) :

    - Tous les appels à Google Cloud TTS passent par cette route
    - Le quota est vérifié **AVANT** chaque appel API
    - Le quota global est stocké dans `.quota/google-tts.json` (côté serveur)
    - Si la limite est atteinte, l'API retourne une erreur 429

2. **Hook client** (`hooks/use-speech-synthesis.ts`) :

    - Appelle l'API route au lieu d'appeler directement Google
    - Reçoit le quota mis à jour depuis le serveur
    - Bascule automatiquement vers l'API native si le quota est dépassé
    - Synchronise le localStorage pour l'affichage (informatif uniquement)

3. **Fichier de quota** (`.quota/google-tts.json`) :
    - Stocké côté serveur uniquement
    - Compte tous les utilisateurs ensemble
    - Réinitialisé automatiquement chaque mois

**Pourquoi cette architecture ?**

-   ✅ **Sécurité** : Impossible de contourner la limite en modifiant le code client
-   ✅ **Centralisé** : Un seul compteur pour tous les utilisateurs
-   ✅ **Fiable** : La vérification se fait côté serveur avant l'appel API
-   ✅ **Transparent** : L'utilisateur voit son utilisation via le hook

**Exemple d'utilisation :**

```typescript
// Côté client - plus besoin de clé API
const { speak, quotaUsage, quotaExceeded, quotaLimit } = useSpeechSynthesis({
    provider: "google",
    googleVoiceType: "neural",
});

// Afficher l'utilisation actuelle (synchronisée avec le serveur)
if (quotaUsage) {
    console.log(`Utilisation globale: ${quotaUsage.charactersUsed} / ${quotaLimit} caractères`);
    if (quotaExceeded) {
        console.warn("Limite atteinte, utilisation de l'API native");
    }
}
```

**Configuration serveur :**

Le fichier `.quota/google-tts.json` est créé automatiquement et contient :

```json
{
    "charactersUsed": 50000,
    "monthStart": "2024-01",
    "lastReset": 1704067200000
}
```

Ce fichier est dans `.gitignore` et ne doit pas être commité.
