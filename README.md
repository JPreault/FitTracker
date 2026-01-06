# 🏃‍♂️ Fit Tracker

**Fit Tracker** est une application web personnelle développée avec **Next.js**, conçue pour centraliser des calculateurs fiables liés à la forme, à l’activité physique et à la nutrition, autour d’un profil utilisateur stocké localement.

L’objectif n’est pas de créer une application médicale, mais un **outil du quotidien**, transparent, précis et cohérent, là où la majorité des calculateurs en ligne sont dispersés, approximatifs ou peu documentés.

---

## 🎯 Objectifs du projet

- Centraliser plusieurs calculateurs “fitness” dans une seule application
- Reposer sur un **profil utilisateur unique** (local, privé, sans backend)
- Garantir des **résultats fiables**, traçables et compréhensibles
- Mettre en avant la **transparence des formules et hypothèses**
- Concevoir une base **modulaire et extensible** (mini-apps indépendantes)
- Proposer une application **offline-first**, installable en **PWA**

---

## 🧩 Philosophie générale

Fit Tracker est construit autour de principes forts et non négociables :

- **Mini-applications isolées**  
  Chaque fonctionnalité est une mini-app autonome (inputs → calcul → outputs).

- **Fiabilité avant exhaustivité**  
  Les calculs reposent sur des modèles reconnus.  
  Si une donnée critique est absente → le calcul est bloqué ou explicitement dégradé.

- **Transparence totale**  
  Chaque résultat affiche :
  - les données utilisées,
  - les hypothèses,
  - la formule / le modèle,
  - les limites du calcul.

- **Client-only & respect de la vie privée**  
  Aucune base de données, aucun tracking, aucune donnée envoyée à un serveur.

---

## 🧍 Profil utilisateur (source de vérité)

Les calculs reposent sur un **profil utilisateur centralisé**, stocké en `localStorage`.

### Champs du profil (MVP)

| Champ         | Description                              |
|---------------|------------------------------------------|
| Sexe          | requis pour certains calculs (BMR)       |
| Âge           | requis pour BMR / zones cardio            |
| Taille (cm)   | foulée / BMR / BMI                        |
| Poids (kg)    | BMR / BMI / hydratation                   |
| Niveau d’activité | facteur TDEE                          |

👉 Le profil peut être **partiellement renseigné** : chaque mini-app définit ses champs requis.

---

## 🧮 Mini-applications disponibles

### 🚶 Steps – Distance → Pas
- Estimation du nombre de pas à partir d’une distance
- Foulée estimée via la taille
- **Calibration manuelle** recommandée pour plus de précision
- Affichage clair : distance, foulée utilisée, méthode

### 🔥 Calories – Maintien calorique (TDEE)
- Calcul du métabolisme de base (BMR) via **Mifflin-St Jeor**
- Ajustement par niveau d’activité
- Garde-fous sur les valeurs extrêmes
- Suggestions de déficit / surplus modéré

### 📏 BMI – Indice de masse corporelle
- Calcul de l’IMC
- Interprétation selon la classification OMS
- Avertissements en cas de valeurs atypiques

### 🎯 Objectif calorique
- Définition d’une cible calorique selon un rythme de perte / prise de poids
- Estimation de la durée pour atteindre un objectif
- Garde-fous sur les déficits excessifs

### 🍽️ Macros
- Répartition protéines / lipides / glucides
- Mode par ratios (%) ou par protéines en g/kg
- Rappels énergétiques (4/4/9)
- Vérification de cohérence des macros

### ⏱️ Pace – Temps / Allure / Distance
- Convertisseur pour la marche et la course
- Donner 2 valeurs → calculer la 3e
- Gestion des formats temps (hh:mm:ss)
- Résultats lisibles et testables

### ❤️ Zones cardio
- Estimation de la FC max (ou saisie manuelle)
- Calcul des zones Z1 à Z5
- Avertissements si valeurs incohérentes

### 💧 Hydratation
- Estimation des besoins hydriques journaliers
- Ajustement selon activité et conditions
- Résultat explicite et contextualisé

---

## 🛠 Stack technique

- **Framework** : Next.js (App Router)
- **Langage** : TypeScript
- **UI** : Tailwind CSS + shadcn/ui
- **État global** : Zustand (avec persistance localStorage)
- **Formulaires** : React Hook Form + Zod
- **Architecture** : client-only
- **PWA** : offline-first, installable

## 🔒 Validation & sécurité

- Validation stricte via Zod
- Bornes réalistes sur toutes les données sensibles
- Sanity checks sur les résultats
- Aucun cookie, aucun tracking
- Données strictement locales

---

## 🚀 Roadmap

- Lien vers site personnel (target `_blank`, `rel="nofollow"`)
- Bouton de partage (site / résultats)
- Header fixe avec effet glass blur
- Prise en compte de l’inclinaison pour les steps
- Calcul des calories brûlées via steps
- Macros basées par défaut sur le TDEE calculé
- Historique des données
- Export / import du profil
- Multi-profils
- Synchronisation cloud optionnelle

---

## ⚠️ Disclaimer

> Fit Tracker fournit des **estimations basées sur des modèles généraux**.  
> Il ne remplace pas un avis médical ou nutritionnel professionnel.

---

## 👨‍💻 Auteur

Projet conçu et développé par **Alexandre Artisien**  
👉 [https://www.alexandre-artisien.fr](https://www.alexandre-artisien.fr)

