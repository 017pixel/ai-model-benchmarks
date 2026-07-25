# ai-model-benchmarks

Vergleich verschiedener KI-Modelle beim Erstellen von Browser-Spielen und Web-Projekten.

## Übersicht

Dieses Repository dokumentiert Benchmarks verschiedener KI-Modelle, die jeweils beauftragt wurden, eigene Spiel- und Webprojekte im Browser zu erstellen. Jedes Modell wurde mit denselben Projektanforderungen getestet, um die Ergebnisse vergleichen zu können.

## Modelle

| Modell | Projekt | Beschreibung |
|--------|---------|-------------|
| **GLM 5.2** | Terraria Clone | 2D-Sandbox-Spiel mit Procedural Generation |
| **GLM 5.2 + GLM 5 Turbo** | Terraria Clone | Kombination zweier GLM-Modelle |
| **GPT-5.6** | GTA Clone | Open-World-Stadt mit PBR-Rendering |
| **GPT-5.6** | Minecraft Clone | 3D-Voxel-Welt mit Crafting |
| **GPT-5.6** | Parcour World | Parkour-Plattformspiel |
| **GPT-5.6** | Terraria Clone | 2D-Sandbox-Abenteuer |
| **Tencent HY 3** | Portfolio | Portfolio-Webseite |
| **Tencent HY 3** | Minecraft Clone | Voxel-Welt |
| **Tencent HY 3** | Terraria Clone | 2D-Sandbox |
| **Tencent HY 3** | Haus der Zukunft | Architektur-Visualisierung |

## Prompts

Die verwendeten Prompts für jeden Benchmark finden sich im Ordner [`Promts/`](Promts/).

## Struktur

```
Promts/                          - Prompt-Dokumentation
GLM_5.2/                         - GLM 5.2 Benchmark-Projekte
GLM_5.2_und_GLM_5_Turbo/         - Kombination beider GLM-Modelle
GPT-5.6_Sol/                     - GPT-5.6 Benchmark-Projekte
Tencent_HY3/                     - Tencent HY 3 Benchmark-Projekte
```

## Lokal ausführen

```bash
git clone https://github.com/017pixel/ai-model-benchmarks.git
cd ai-model-benchmarks
cd <projekt-ordner>
npm install
npm run dev
```

## Lizenz

MIT License © 2026 Benjamin Becker