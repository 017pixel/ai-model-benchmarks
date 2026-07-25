# Höchste Qualitätsanforderungen

Dies ist ein Benchmark für die maximale Leistungsfähigkeit eines Coding-Modells. Priorisiere Qualität über Geschwindigkeit der Entwicklung. Jeder Bestandteil des Projekts soll so hochwertig wie möglich umgesetzt werden.

## Rendering

Nutze alle modernen Rendering-Techniken, die im Browser sinnvoll realisierbar sind.

Wenn möglich, implementiere hardwarebeschleunigtes Ray Tracing über WebGPU oder eine vergleichbare Lösung. Falls echtes Ray Tracing aufgrund der Browser- oder Hardwareeinschränkungen nicht verfügbar ist, simuliere einen möglichst ähnlichen visuellen Eindruck durch hochwertige Screen Space Reflections, Global Illumination, Ambient Occlusion, hochwertige Shadow Maps und weitere moderne Rendering-Techniken. Wähle automatisch die bestmögliche Lösung für die jeweilige Plattform.

Die Grafik soll sich an modernen AAA-Spielen orientieren.

## 3D-Modelle

Die Qualität der 3D-Modelle hat höchste Priorität.

Alle Gebäude, Fahrzeuge, Straßen, Innenräume, Vegetation und Objekte sollen möglichst hochwertig, detailliert und realistisch aussehen.

Vermeide einfache Platzhalter, primitive Würfelarchitektur oder generische Low-Poly-Modelle. Nutze stattdessen komplexe Geometrien, hochwertige PBR-Materialien, realistische Proportionen und glaubwürdige Details.

Besondere Aufmerksamkeit gilt:

* Gebäudefassaden
* Fenster
* Dächer
* Straßen
* Gehwege
* Fahrzeuge
* Vegetation
* Straßenmöbel
* Beleuchtung
* Schilder
* Brücken
* Tunnel
* Innenhöfe

Falls geeignete frei nutzbare Assets verfügbar sind, integriere diese automatisch. Andernfalls erstelle prozedurale oder individuell modellierte Objekte mit möglichst hoher Qualität.

## Materialien

Alle Materialien sollen physikalisch korrekt gerendert werden und hochwertige Texturen verwenden.

Nutze unter anderem:

* Albedo Maps
* Normal Maps
* Roughness Maps
* Metallic Maps
* Ambient Occlusion Maps
* Height oder Displacement Maps, sofern sinnvoll

Die Oberflächen sollen realistisch auf Licht reagieren.

## Beleuchtung

Implementiere eine möglichst realistische Beleuchtung mit:

* dynamischem Sonnenlicht
* realistischem Himmel
* indirekter Beleuchtung
* weichen Schatten
* Reflexionen
* Emissionsmaterialien
* volumetrischem Nebel
* atmosphärischen Effekten

## Visuelles Ziel

Das Ergebnis soll nicht wie eine einfache Browser-Demo wirken, sondern wie ein technisch beeindruckender AAA-Prototyp. Jeder Bereich der Welt soll hochwertig gestaltet sein und aus der Nähe ebenso überzeugen wie aus großer Entfernung.
