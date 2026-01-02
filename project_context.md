# Health Toolkit – Documentation Technique (MVP)

## 1. Objectif du projet

Créer une application **Next.js client-only** (sans backend) permettant à un utilisateur de :

* définir un **profil de santé** stocké localement,
* accéder à plusieurs **mini-applications (calculateurs)** via des onglets,
* obtenir des **résultats fiables, traçables et explicitement documentés**,
* utiliser l’application **offline** et l’installer en **PWA**.

L’application **n’est pas médicale**. Tous les calculs sont des **estimations basées sur des modèles reconnus**, avec affichage explicite des hypothèses.

---

## 2. Principes clés (non négociables)

1. **Mini-applications isolées**

   * Chaque onglet = une mini-app indépendante
   * Entrées → calcul → sortie
   * Dépendance au profil uniquement via une API interne claire

2. **Fiabilité avant exhaustivité**

   * Modèles reconnus (documentés)
   * Refus de calcul si données critiques manquantes
   * Résultats “dégradés” clairement signalés si hypothèses utilisées

3. **Transparence**

   * Toujours afficher :

     * les données utilisées,
     * les hypothèses,
     * la formule / le modèle,
     * les limites.

4. **Client-only**

   * Données stockées en `localStorage`
   * Pas de tracking, pas de base de données
   * Export/import JSON possible (futur)

---

## 3. Architecture globale du projet

```
/app
  /profile              → onglet Profil
  /steps                → mini-app Pas / Distance
  /calories             → mini-app Maintien calorique
  /layout.tsx           → Tabs globales
/lib
  /profile              → modèle + store + validation
  /calculators
    /steps               → calculs pas / foulée
    /calories            → BMR / TDEE
  /constants            → facteurs, niveaux d’activité
  /guards               → règles de validation métier
/types
  profile.ts
  calculators.ts
```

---

## 4. Profil utilisateur (source de vérité)

### Champs du profil (MVP)

| Champ         | Type                        | Obligatoire | Rôle            |
| ------------- | --------------------------- | ----------- | --------------- |
| sex           | male | female | unspecified | oui         | requis pour BMR |
| ageYears      | number | null               | oui         | requis pour BMR |
| heightCm      | number | null               | non         | foulée / BMR    |
| weightKg      | number | null               | non         | BMR             |
| activityLevel | enum | unspecified          | oui         | TDEE            |

### Règles

* Le profil peut être **incomplet**
* Chaque mini-app définit **ses propres champs requis**
* Valeurs manquantes → soit hypothèse explicite, soit blocage du calcul

---

## 5. Mini-application #1 : Distance → Pas

### Objectif

Convertir une distance (km/m) en nombre de pas, à partir :

* d’une **foulée estimée** (par défaut),
* ou d’une **foulée calibrée** (recommandé).

---

### Modèle de calcul

#### 1. Foulée estimée (par taille)

Formule couramment utilisée :

```
Longueur de pas (m) = Taille (cm) × 0.413 / 100
```

> ⚠️ C’est une estimation moyenne. Elle dépend de l’allure, du terrain et de l’individu.

#### 2. Calcul du nombre de pas

```
Nombre de pas = Distance (m) / Longueur de pas (m)
```

---

### Calibration (fortement recommandée)

**Principe**
L’utilisateur marche une distance connue (ex : 500 m) et renseigne son nombre de pas réel.

```
Foulée réelle = Distance connue / Pas mesurés
```

Cette valeur devient prioritaire sur la foulée estimée.

---

### Règles métier

* Si taille absente → proposer calibration
* Si foulée par défaut utilisée → badge “estimation”
* Toujours afficher :

  * distance entrée
  * foulée utilisée
  * méthode (estimée / calibrée)

---

## 6. Mini-application #2 : Maintien calorique (TDEE)

### Objectif

Estimer le **Total Daily Energy Expenditure (TDEE)** à partir :

* du métabolisme de base (BMR),
* du niveau d’activité.

---

### Modèle choisi : Mifflin–St Jeor (recommandé)

#### BMR (Basal Metabolic Rate)

**Homme**

```
BMR = (10 × poids kg) + (6.25 × taille cm) − (5 × âge) + 5
```

**Femme**

```
BMR = (10 × poids kg) + (6.25 × taille cm) − (5 × âge) − 161
```

Ce modèle est largement utilisé en nutrition clinique.

---

### Facteurs d’activité

| Niveau      | Facteur | Description                      |
| ----------- | ------- | -------------------------------- |
| sedentary   | 1.2     | peu ou pas d’activité            |
| light       | 1.375   | 1–3 séances / semaine            |
| moderate    | 1.55    | 3–5 séances / semaine            |
| active      | 1.725   | sport quotidien                  |
| very_active | 1.9     | sport intense + travail physique |

---

### Calcul du maintien calorique

```
TDEE = BMR × facteur d’activité
```

---

### Règles métier critiques

* Champs **obligatoires** :

  * sexe
  * âge
  * taille
  * poids
  * niveau d’activité
* Si un champ est manquant → **calcul bloqué**
* Sanity checks :

  * < 1200 kcal/j → avertissement
  * > 5000 kcal/j → avertissement

---

### Transparence affichée à l’utilisateur

* Modèle utilisé : *Mifflin–St Jeor*
* Données du profil utilisées
* Facteur d’activité sélectionné
* Résultat arrondi + valeur brute

---

## 7. Gestion des valeurs par défaut

### Principe

Les valeurs par défaut servent à :

* permettre la navigation,
* pré-remplir l’UI,
* **pas à produire des chiffres “précis”**.

### Exemple

* activityLevel par défaut : `sedentary`
* sexe : `unspecified`

⚠️ Un calcul basé sur des valeurs par défaut doit être **explicitement signalé**.

---

## 8. Validation & sécurité

* Validation des entrées avec Zod
* Bornes réalistes :

  * taille : 120–230 cm
  * poids : 35–250 kg
  * âge : 10–100 ans
* Aucune persistance serveur
* Pas de cookies, pas de tracking

---

## 9. Évolutions prévues (hors MVP)

* Historique poids / calories
* Maintien calorique “observé” (empirique)
* Export / import profil
* Multi-profils
* Synchronisation cloud optionnelle

---

## 10. Disclaimer (à afficher dans l’app)

> Cette application fournit des **estimations basées sur des modèles généraux**.
> Elle ne remplace pas un avis médical ou nutritionnel professionnel.

### Idées de fonctionnalités 


# A) BMI + interprétation simple

## Objectif
Calculer l’IMC (BMI) et l’interpréter selon les catégories standard adultes.

## Entrées
- `heightCm` (profil) – requis
- `weightKg` (profil) – requis

## Calcul
1. Conversion taille en mètres :
   - `heightM = heightCm / 100`
2. BMI :
   - `bmi = weightKg / (heightM^2)` :contentReference[oaicite:0]{index=0}

## Sorties
- `bmi` (float, arrondi à 0.1)
- `category` (string)
- `warnings[]`

## Catégories (adultes)
Basées sur la classification WHO :
- `< 18.5` : Underweight
- `18.5–24.9` : Normal
- `25.0–29.9` : Overweight
- `>= 30.0` : Obesity :contentReference[oaicite:1]{index=1}

> Option (si tu veux être plus précis côté “obesity”) :
> - 30–34.9 : classe I
> - 35–39.9 : classe II
> - >=40 : classe III

## Garde-fous / avertissements
- Si `bmi < 15` ou `bmi > 50` :
  - warning: “Valeur atypique : vérifier taille/poids saisis.”
- Afficher un disclaimer : “Le BMI est un indicateur général ; ne reflète pas la composition corporelle.”

## UI minimum
- Card “Résultat IMC”
- Badge “Normal / Surpoids / Obésité…”
- Section “Données utilisées” (taille, poids)
- Section “Formule”

## Tests unitaires (exemples)
- 70kg / 1.75m => ~22.9
- 58kg / 1.70m => ~20.1 (exemple WHO) :contentReference[oaicite:2]{index=2}

---

# B) Objectif calorique “à rythme” (perte / prise)

## Objectif
Proposer une cible calorique quotidienne cohérente avec un rythme de variation de poids choisi, et estimer le temps pour atteindre un objectif.

## Entrées
- `tdee` (calculé via mini-app “Maintien calorique”) – requis
- Mode: `"loss" | "gain"` – requis
- Rythme (kg/semaine) – requis (ex: 0.25, 0.5)
- Optionnel : objectif poids final `targetWeightKg` (si tu veux estimer une durée)

## Hypothèses / constantes
- Approx énergétique : `1 kg ≈ 7700 kcal` (règle de pouce) :contentReference[oaicite:3]{index=3}
- Rythme recommandé “safe” (perte) : ~0.5–1 kg/sem max (≈ 1–2 lbs/sem) :contentReference[oaicite:4]{index=4}

## Calcul – calories cibles
1. Déficit/surplus hebdo :
   - `weeklyDeltaKcal = rateKgPerWeek * 7700`
2. Déficit/surplus journalier :
   - `dailyDeltaKcal = weeklyDeltaKcal / 7`
3. Calories cibles :
   - perte : `targetCalories = tdee - dailyDeltaKcal`
   - prise : `targetCalories = tdee + dailyDeltaKcal`

## Estimation du temps (si objectif poids final fourni)
- `deltaWeight = abs(targetWeightKg - currentWeightKg)`
- `weeks = deltaWeight / rateKgPerWeek`

## Sorties
- `targetCalories` (kcal/j)
- `dailyDeltaKcal` (kcal/j)
- `estimatedWeeks` (si possible)
- `warnings[]`

## Garde-fous critiques
### Perte
- Si `rateKgPerWeek > 1.0` → warning “Rythme élevé, souvent difficile à maintenir” :contentReference[oaicite:5]{index=5}
- Si `targetCalories < 1200` → warning + blocage optionnel (selon ton niveau de prudence)

### Prise
- Si `rateKgPerWeek > 0.5` → warning “Surplus important : prise de gras probable”

## UI minimum
- Slider / select du rythme (0.25 / 0.5 / 0.75 / 1.0)
- Résultat : “Cible kcal/j” + “Différence vs maintien”
- (Optionnel) champ “objectif poids”

## Tests
- tdee=2800, perte 0.5kg/sem => dailyDelta ≈ 550 => target ≈ 2250

---

# C) Calculateur de macros (Protéines / Lipides / Glucides)

## Objectif
Transformer une cible calorique en répartition macro, avec ratios configurables + mode “recommandé”.

## Entrées
- `targetCalories` (ou `tdee`) – requis
- `weightKg` (profil) – recommandé (pour calculer protéines g/kg)
- Mode de configuration :
  - `byRatio` (ex: P30/F25/C45)
  - `byProteinPerKg` + lipides ratio + glucides reste

## Rappels (constantes énergétiques)
- Protéines : 4 kcal/g
- Glucides : 4 kcal/g
- Lipides : 9 kcal/g

## Option 1 – Mode ratio (% calories)
Entrées :
- `proteinPct`, `fatPct`, `carbPct` (doivent totaliser 100)

Calcul :
- `proteinG = (targetCalories * proteinPct/100) / 4`
- `fatG     = (targetCalories * fatPct/100) / 9`
- `carbG    = (targetCalories * carbPct/100) / 4`

Garde-fous :
- somme != 100 → erreur
- `fatPct < 15` → warning (trop bas)
- `proteinPct > 40` → warning (très élevé)

## Option 2 – Mode “protéines g/kg” (plus fiable pour sportifs)
Entrées :
- `proteinGPerKg` (ex: 1.2–2.0)
- `fatPct` (ex: 25–35)
- glucides = reste

Référence “ordre de grandeur” (actifs/sport) :
- ~1.2–2.0 g/kg/j (selon intensité/objectif) :contentReference[oaicite:6]{index=6}

Calcul :
1. `proteinG = weightKg * proteinGPerKg`
2. `proteinKcal = proteinG * 4`
3. `fatKcal = targetCalories * fatPct/100`
4. `fatG = fatKcal / 9`
5. `carbKcal = targetCalories - proteinKcal - fatKcal`
6. `carbG = carbKcal / 4`

Garde-fous :
- `carbKcal < 0` → erreur (protéines trop hautes / lipides trop hauts)
- `proteinGPerKg` hors [0.8, 2.5] → warning/erreur selon politique

## Sorties
- macros en grammes (`proteinG`, `fatG`, `carbG`)
- macros en calories (optionnel)
- warnings

## UI minimum
- Choix mode (Tabs : “Ratio” / “Protéines g/kg”)
- Résultats en 3 cards (P/F/C)
- Afficher règles énergétiques (4/4/9)

---

# D) Convertisseur “Temps / Allure / Distance” (course/marche)

## Objectif
Donner 2 valeurs → calculer la 3e (très utile et testable).

## Entrées
- Distance : km ou m
- Temps : hh:mm:ss
- Allure : min/km (ou vitesse km/h en option)
- L’utilisateur choisit la variable à calculer.

## Modèle de données
- Convertir tout en secondes et kilomètres :
  - `timeSec`
  - `distanceKm`

## Calculs
### 1) Allure (sec/km)
- `paceSecPerKm = timeSec / distanceKm`
- Affichage min/km : `mm:ss`

### 2) Temps
- `timeSec = paceSecPerKm * distanceKm`

### 3) Distance
- `distanceKm = timeSec / paceSecPerKm`

### Option vitesse (km/h)
- `speedKmh = distanceKm / (timeSec/3600)`
- `paceMinPerKm = 60 / speedKmh`

## Garde-fous
- distance <= 0 ou time <= 0 → erreur
- normaliser `hh:mm:ss` (ex: 5:30 = 5 min 30 sec)

## UI minimum
- 3 champs + 1 select “calculer : temps / allure / distance”
- Bouton “Calculer”
- Résultat dans une card

## Tests
- 10 km en 50:00 => allure 5:00 /km
- allure 6:00 /km + 5 km => temps 30:00

---

# E) Zones cardio (FC max / zones Z1–Z5)

## Objectif
Estimer des zones d’intensité à partir de la FC max (mesurée ou estimée).

## Entrées
- Mode A : `ageYears` (profil) → FC max estimée
- Mode B : `hrMaxMeasured` (input) → prioritaire

## FC max estimée (simple, MVP)
- `hrMax = 220 - age` (modèle simple, connu mais approximatif) :contentReference[oaicite:7]{index=7}

## Zones (5 zones, % de HRmax)
Deux options possibles :
1) **Zones “classiques”** (50–60 / 60–70 / 70–80 / 80–90 / 90–100) :contentReference[oaicite:8]{index=8}
2) **Zones type “intensity ranges”** (ex : <57 / 57–63 / 64–76 / 77–95 / 96–100) :contentReference[oaicite:9]{index=9}

### Recommandation MVP
- Utiliser l’option 1 (plus simple à comprendre)
- Afficher un disclaimer : “Les zones varient selon les méthodes et la FC max estimée peut être imprécise.”

Calcul (option 1) :
- Z1 = 50–60% * hrMax
- Z2 = 60–70%
- Z3 = 70–80%
- Z4 = 80–90%
- Z5 = 90–100%

## Sorties
- `hrMax`
- `zones[] = [{name, minBpm, maxBpm}]`
- warnings

## Garde-fous
- Si `ageYears` absent et `hrMaxMeasured` absent → blocage
- Si `hrMaxMeasured < 120` ou `> 230` → warning “valeur atypique”

## UI minimum
- Input FC max mesurée (optionnel)
- Sinon utilisation âge
- Table zones bpm

---

# F) Hydratation (estimation)

## Objectif
Donner une estimation journalière de besoins hydriques, avec ajustements simples (activité / température).

## Entrées
- `weightKg` (profil) – requis
- `activityLevel` (profil) – optionnel
- `weather` (optionnel) : “cool / mild / hot” (simple enum)
- Optionnel : durée sport (minutes/jour)

## Modèle MVP (simple + transparent)
### Base (par poids)
- `baseMl = weightKg * 30` à `35` ml/kg/j (choisir une valeur fixe, ex 35)  
  > Note : ce type de règle est très utilisé, mais la référence officielle la plus robuste reste les apports adéquats (AI) globaux (voir plus bas).

### Ajustements (simples)
- activité :
  - light : +250 ml
  - moderate : +500 ml
  - active : +750 ml
  - very_active : +1000 ml
- météo :
  - hot : +500 ml

### Sortie
- `totalLiters = (baseMl + adjustmentsMl) / 1000`

## Références (pour contextualiser dans l’app)
- Les apports “adéquats” globaux sont souvent donnés autour de 2.5L/j (hommes) et 2.0L/j (femmes) (total eau aliments + boissons) en conditions modérées, selon EFSA. :contentReference[oaicite:10]{index=10}
- Les besoins varient fortement selon la sudation ; les recommandations sport insistent sur une approche individualisée (mesure de perte de poids avant/après effort). :contentReference[oaicite:11]{index=11}

## Garde-fous
- Si `weightKg` absent → blocage
- Si `totalLiters < 1.0` ou `> 6.0` → warning “valeur atypique”
- Afficher : “Estimation — à ajuster selon soif, couleur des urines, chaleur, sport.”

## UI minimum
- Afficher “Base (ml/kg)” + ajustements choisis
- Résultat en litres/j
- Toggle “Il fait chaud” / “Je fais du sport”