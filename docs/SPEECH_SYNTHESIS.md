# Guide de Configuration de la Synthèse Vocale

Ce guide explique comment configurer différentes solutions de synthèse vocale gratuites pour améliorer la qualité des voix en français.

## Solutions Disponibles

### 1. API Native (Web Speech API) - Par défaut ✅

**Avantages :**
- ✅ Gratuit et sans configuration
- ✅ Fonctionne immédiatement
- ✅ Pas de limite d'utilisation
- ✅ Aucune clé API nécessaire

**Inconvénients :**
- ⚠️ Qualité variable selon le navigateur
- ⚠️ Voix parfois robotiques

**Configuration :**
Aucune configuration nécessaire. Le système sélectionne automatiquement la meilleure voix française disponible sur votre navigateur.

---

### 2. Azure Cognitive Services Speech - Recommandé 🎯

**Avantages :**
- ✅ **Gratuit jusqu'à 500 000 caractères/mois**
- ✅ Voix neurales très réalistes (DeniseNeural, ThierryNeural, etc.)
- ✅ Qualité professionnelle
- ✅ Support excellent du français

**Inconvénients :**
- ⚠️ Nécessite une clé API (gratuite)
- ⚠️ Limite de 500k caractères/mois (généralement suffisant)

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
- `fr-FR-DeniseNeural` (Femme, voix douce)
- `fr-FR-HenriNeural` (Homme, voix claire)
- `fr-FR-ThierryNeural` (Homme, voix professionnelle)
- `fr-FR-EliseNeural` (Femme, voix expressive)

---

### 3. Google Cloud Text-to-Speech

**Avantages :**
- ✅ **Gratuit jusqu'à 4 millions de caractères/mois**
- ✅ Voix neurales de très haute qualité
- ✅ Très bon support du français

**Inconvénients :**
- ⚠️ Nécessite une clé API
- ⚠️ Configuration plus complexe

**Configuration :**

1. **Créer un projet Google Cloud :**
   - Allez sur [console.cloud.google.com](https://console.cloud.google.com)
   - Créez un nouveau projet

2. **Activer l'API Text-to-Speech :**
   - Activez l'API "Cloud Text-to-Speech API"
   - Créez une clé API dans "Identifiants"

3. **Configurer dans votre application :**
   
   Dans `.env.local` :
   ```env
   NEXT_PUBLIC_GOOGLE_TTS_API_KEY=votre_cle_google
   ```

4. **Activer Google dans le code :**
   ```typescript
   const { speak, stop } = useSpeechSynthesis({
       provider: "google",
       googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY,
   });
   ```

---

## Comparaison des Solutions

| Solution | Qualité | Gratuit | Limite | Configuration |
|----------|---------|---------|--------|---------------|
| **Native** | ⭐⭐ | ✅ Illimité | Aucune | Aucune |
| **Azure** | ⭐⭐⭐⭐⭐ | ✅ 500k/mois | 500k caractères | Facile |
| **Google** | ⭐⭐⭐⭐⭐ | ✅ 4M/mois | 4M caractères | Moyenne |

## Recommandation

Pour la meilleure expérience gratuite, nous recommandons **Azure Cognitive Services** :
- Qualité professionnelle
- Limite généreuse (500k caractères/mois)
- Configuration simple
- Voix neurales très réalistes en français

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

- Les clés API doivent être dans des variables d'environnement pour la sécurité
- Ne commitez jamais vos clés API dans le code
- Le fichier `.env.local` est déjà dans `.gitignore`
- Azure et Google offrent un fallback automatique vers l'API native en cas d'erreur

