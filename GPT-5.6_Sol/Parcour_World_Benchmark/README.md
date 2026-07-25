# ROOFLINE

ROOFLINE ist ein frei erkundbares First-Person-Parkour-Spiel für den Browser. Die prozedural aufgebaute Stadt umfasst 21 Gebäude, miteinander verbundene Dachrouten, Gassen, Parkplätze, Baustellen und einen zentralen Parkour-Distrikt.

## Start

```bash
npm install
npm run dev
```

Das Spiel läuft unter `http://localhost:4000`.

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| `WASD` | Bewegen und Air Control |
| Maus | Blicksteuerung |
| `Shift` | Sprinten |
| `Leertaste` | Springen, Doppelsprung, Wall Jump, Mantle |
| `Strg` | Ducken, Sliden, Hang loslassen |
| `E` | Dash |
| `R` | Zum Startpunkt zurückkehren |
| `Esc` | Pause / Maus freigeben |

Weitsprünge entstehen aus Sprint, Slide und Sprung. Niedrige Hindernisse werden bei Vorwärtsbewegung automatisch gevaultet. Wall Runs, Wall Climbs, Ledge Grabs und Rail Grinds werden kontextabhängig aktiviert und können direkt in Sprünge übergehen.

## Technik

- Three.js mit PBR-Materialien, prozeduraler Skybox, Fog und weichen Schatten
- TypeScript und Vite
- Eigene Fixed-Step-Physik mit räumlich indizierten AABB-Kollisionen
- Instancing für Gebäudefenster und wiederverwendete Geometrien/Materialien
- Prozedurales Web Audio ohne externe Dateien
- First-Person-Kamera mit Head Bob, Landing Kick, Wall-Run-Roll und dynamischem FOV
