# 09 — Glossaire / Glossary 🇫🇷🇬🇧

Les sigles lean diffèrent entre le français et l'anglais. Ce tableau donne les
deux, plus une définition courte. Dans l'appli, le dictionnaire complet
(recherchable, avec formules) est sous le bouton 📖.

## Taux de rendement / Performance rates (NF E 60-182)

| 🇫🇷 | 🇬🇧 | Définition |
|---|---|---|
| **TRS** — Taux de Rendement Synthétique | **OEE** — Overall Equipment Effectiveness | Disponibilité × Performance × Qualité = temps utile ÷ temps **requis** |
| **TRG** — Taux de Rendement Global | (≈ OEE over loading time) | TRS × engagement = temps utile ÷ temps d'**ouverture** |
| **TRE** — Taux de Rendement Économique | (≈ TEEP) | TRG × ouverture = temps utile ÷ temps **total** (24/7) |
| Disponibilité | Availability (A) | temps de fonctionnement ÷ temps requis |
| Performance / allure | Performance / speed rate (P) | cadence réelle ÷ cadence nominale |
| Qualité | Quality (Q) | bonnes pièces ÷ pièces produites = 1 − rebut |

## Temps / Times

| 🇫🇷 | 🇬🇧 | Définition |
|---|---|---|
| **TT** — Temps total | Total time | Le calendrier complet (24 h × 7 j) |
| **TO** — Temps d'ouverture | Opening time | Heures où l'atelier est ouvert |
| **TR** — Temps requis | Required / loading time | Heures où l'on veut produire |
| **TC** — Temps de cycle | **CT** — Cycle time | Temps d'une pièce à un poste |
| Temps takt | Takt time | temps disponible ÷ demande = rythme de la demande |
| Temps de traversée | Lead time | Temps total qu'une pièce met à traverser le flux |

## Flux / Flow

| 🇫🇷 | 🇬🇧 | Définition |
|---|---|---|
| **PCE** — Efficience du cycle | Process cycle efficiency | part du temps de traversée à valeur ajoutée |
| VA / NVA | Value-add / Non-value-add | valeur ajoutée / non-valeur ajoutée (attente) |
| Goulot | Bottleneck | poste au plus grand TC global ; il fixe la capacité |
| Rendement au premier passage | First pass yield (FPY) | proba qu'une pièce passe tous les postes sans défaut |
| Rebut | Scrap | pièces à refaire ou à jeter |
| Changement de série | Setup / changeover | temps de réglage entre deux lots |
| **SMED** | Single-Minute Exchange of Die | méthode de réduction des temps de changement |
| **TPM** | Total Productive Maintenance | maintenance pour augmenter la disponibilité |
| Supermarché | Supermarket | stock géré en tiré (kanban) |
| FIFO | First-In First-Out | file à séquence garantie |
| Heijunka | Heijunka | lissage de la charge |
| Muda | Muda | gaspillage (terme japonais, universel) |
| ETP | FTE — Full-Time Equivalent | équivalent temps plein |

> Note : **TRS = OEE**, **TC = CT**, **TR/TO/TT** n'ont pas d'équivalent
> anglo-saxon strict (l'OEE anglo-saxon raisonne en « loading time » ≈ TR). On
> garde donc les sigles français dans l'interface française.
