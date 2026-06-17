# 03 — L'analyse des taux, pour débutants

> Cet onglet est la **couche en dessous** du VSM standard. Là où le VSM montre le
> flux d'ensemble, l'analyse des taux zoome sur **un poste** et décompose, seconde
> par seconde, où passe son temps. Si vous débutez en lean, lisez ceci en entier :
> tout y est expliqué sans jargon.

Ouvrez-la en **double-cliquant un procédé** sur le canevas VSM, ou via l'onglet
**Analyse des taux**.

---

## 1. L'idée en une phrase

Une machine est « ouverte » beaucoup d'heures, mais ne produit **réellement de
bonnes pièces** qu'une fraction de ce temps. Le reste part en pannes, en
ralentissements et en défauts. Les **taux de rendement** mesurent cette fraction,
selon le périmètre de temps que l'on choisit comme référence.

## 2. La cascade des temps (norme NF E 60-182)

Imaginez le temps comme une cascade : à chaque étage, on enlève une catégorie de
pertes. C'est exactement ce que montre la barre « Cascade des temps » dans l'onglet.

| Niveau | Sigle | Définition | Ce qu'on enlève pour descendre |
|---|---|---|---|
| Temps total | **TT** | Le calendrier complet (24 h × 7 j) | — |
| Temps d'ouverture | **TO** | Les heures où l'atelier est ouvert | les heures fermées (nuit, week-end) |
| Temps requis | **TR** | Les heures où l'on **veut** produire | les arrêts planifiés (pas de commande, maintenance prévue) |
| Temps de fonctionnement | | La machine **tourne** réellement | les **arrêts** (pannes, manque de pièces) → perte de **disponibilité** |
| Temps net | | La machine tourne **à la bonne cadence** | les **ralentissements** et micro-arrêts → perte de **performance (allure)** |
| Temps utile | | Le temps qui a produit de **bonnes** pièces | les **rebuts**/retouches → perte de **qualité** |

> 💡 En français lean on garde les sigles **TT, TO, TR**. Ce sont les termes de la
> norme — ne cherchez pas à les traduire.

## 3. Les trois taux : TRS, TRG, TRE

Tous les trois sont le **même numérateur** (le temps utile, c'est-à-dire les bonnes
pièces) divisé par un **périmètre différent** :

| Taux | Nom complet | Formule | Question à laquelle il répond |
|---|---|---|---|
| **TRS** | Taux de Rendement Synthétique (= **OEE** en anglais) | utile ÷ TR = **Disponibilité × Performance × Qualité** | « Quand je **veux** produire, quelle part est efficace ? » |
| **TRG** | Taux de Rendement Global | utile ÷ TO = TRS × engagement | « Sur mes heures d'**ouverture**, quelle part est efficace ? » |
| **TRE** | Taux de Rendement Économique | utile ÷ TT = TRG × ouverture | « Par rapport au **temps payé / au capital** (24/7), quelle part est efficace ? » |

- **Disponibilité (A)** = temps de fonctionnement ÷ TR
- **Performance / allure (P)** = cadence réelle ÷ cadence nominale
- **Qualité (Q)** = bonnes pièces ÷ pièces produites = 1 − taux de rebut
- **Engagement** = TR ÷ TO (part des heures d'ouverture réellement programmées)
- **Ouverture** = TO ÷ TT (part du calendrier où l'atelier est ouvert)

> 💡 **TRS = OEE.** Si vous connaissez l'OEE anglo-saxon, c'est exactement le TRS.
> Le TRG et le TRE élargissent simplement le périmètre.

### Exemple chiffré

Un poste : disponibilité 80 %, allure 90 %, qualité 95 %, engagement 80 %, ouverture 50 %.

- **TRS** = 0,80 × 0,90 × 0,95 = **68,4 %** → quand on veut produire, 68 % est utile.
- **TRG** = 68,4 % × 0,80 = **54,7 %** → sur les heures d'ouverture, 55 %.
- **TRE** = 54,7 % × 0,50 = **27,4 %** → sur le calendrier complet, 27 %.

Le code couleur dans l'appli : **vert ≥ 85 %**, **orange ≥ 60 %**, **rouge < 60 %**.

## 4. Le Pareto des pertes

Sous les taux, l'appli affiche les **trois familles de pertes en secondes par
jour**, triées de la plus grande à la plus petite :

- **Arrêts (1 − A)** : pannes, manque de pièces, attentes.
- **Allure / micro-arrêts (1 − P)** : la machine tourne mais trop lentement.
- **Défauts (rebut)** : pièces à refaire ou à jeter.

> 🎯 **Attaquez toujours la barre la plus longue en premier** : c'est le point de
> TRS le moins cher à récupérer. (Les trois barres réunies = TR × (1 − TRS), soit
> tout le temps « perdu » à l'intérieur du temps requis.)

## 5. La cascade du temps de cycle (TC) vs takt

À droite, une seconde cascade montre le temps **par pièce** :

1. **TC nominal** — le temps machine « parfait » d'une pièce.
2. **TC effectif** = TC nominal ÷ (A × P) — gonflé par les arrêts et les ralentissements.
3. **TC qualité** = TC effectif ÷ (1 − rebut) — gonflé par les pièces à refaire.
4. **TC global** = TC qualité + (changement de série ÷ taille de lot) — le vrai temps moyen par bonne pièce.

Le **repère rouge = le takt** (le rythme de la demande client). Si la barre « TC
global » dépasse le takt, **le poste ne peut pas suivre la demande** : c'est un goulot.

## 6. Tout est en direct

Les curseurs à gauche (TC, disponibilité, allure, rebut, changement, lot,
engagement, ouverture) **écrivent dans le vrai modèle**. Quand vous bougez un
curseur ici, le canevas VSM, l'échelle des temps, les alertes et les benchmarks
se mettent à jour aussi — et **Ctrl+Z** annule. Rien n'est « pour de faux ».

## 7. Aller plus loin

- Pour comparer plusieurs réglages, enregistrez des **scénarios** (onglet Analyse
  des flux) et basculez entre eux avec le menu déroulant de la barre du haut.
- Pour voir l'effet d'**un seul** paramètre sur tout le flux, utilisez
  l'**explorateur de sensibilité** (onglet Analyse des flux).
- Glossaire complet des sigles : [09 — Glossaire](09-glossary.md).
