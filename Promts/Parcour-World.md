# Aufgabe

Entwickle ein vollständiges 3D-Parkour-Spiel für den Browser mit Three.js. Das Spiel soll nicht wie eine kleine Demo wirken, sondern wie ein eigenständiges Spiel mit einer gut gestalteten, frei erkundbaren Stadt. Du hast alle Skills zur verfügung. 

Du bist sowohl Game Designer als auch Senior Fullstack-Entwickler. Triff eigenständig sinnvolle Entscheidungen für Architektur, Gameplay, Grafik, Performance und Benutzererlebnis. Falls Details fehlen, wähle die Lösung, die für ein modernes Parkour-Spiel am sinnvollsten ist.

## Technologiestack

Verwende ausschließlich moderne Webtechnologien.

Pflicht:

* Three.js
* JavaScript oder TypeScript
* Vite
* npm

Das Projekt muss lokal direkt mit

```bash
npm install
npm run dev
```

startbar sein.

Der Entwicklungsserver muss auf Port **4000** laufen.

## Spielkonzept

Der Spieler befindet sich in einer frei erkundbaren 3D-Stadt.

Der Fokus liegt vollständig auf flüssigem Parkour und Bewegungsfreiheit.

Es gibt keine Levelauswahl oder linearen Ablauf. Stattdessen erkundet der Spieler die Stadt frei und kombiniert verschiedene Bewegungen.

Die Steuerung soll sich schnell, direkt und dynamisch anfühlen.

## Parkour-System

Implementiere ein modernes Parkour-System mit möglichst vielen der folgenden Fähigkeiten:

* Sprinten
* Springen
* Doppelsprung
* Weitsprung
* Präzisionssprung
* Wall Run
* Wall Jump
* Wall Climb
* Mantling
* Vault über Hindernisse
* Sliding
* Ducken
* Klettern
* Ledge Grab
* Hangeln
* Geländer grinden
* Schrägen herunterrutschen
* Bunny Hop
* Momentum-System
* Air Control
* Dash
* Fallschaden nur optional

Alle Bewegungen sollen flüssig ineinander übergehen.

Momentum soll erhalten bleiben und belohnt werden.

## Spielwelt

Erstelle eine kleine, aber glaubwürdige Stadt.

Mindestens enthalten:

* 15 verschiedene Gebäude
* Straßen
* Gehwege
* Kreuzungen
* Bürgersteige
* Dächer
* Hinterhöfe
* Gassen
* Parkplätze

Zusätzlich viele Parkour-Objekte wie:

* Geländer
* Treppen
* Rampen
* Müllcontainer
* Baugerüste
* Mauern
* Klimaanlagen
* Rohre
* Werbetafeln
* Kisten
* Paletten
* Container
* Zäune
* Balkone
* Brücken

Die Objekte sollen bewusst so platziert sein, dass lange Parkour-Kombinationen möglich sind.

## Grafik

Nutze einen modernen Stil.

Die Szene soll enthalten:

* PBR-Materialien
* realistische Beleuchtung
* Shadows
* Ambient Occlusion falls sinnvoll
* Fog
* Skybox oder HDRI
* gute Farben
* stimmige Atmosphäre

Die Stadt soll nicht leer wirken.

Nutze Wiederverwendung von Assets, damit die Performance hoch bleibt.

## Kamera

Nutze eine First-Person- oder Third-Person-Kamera, je nachdem welche das Gameplay verbessert.

Die Kamera soll:

* weich folgen
* leicht wippen beim Laufen
* FOV beim Sprint erhöhen
* sanfte Landeeffekte besitzen

## Steuerung

Standard-PC-Steuerung:

* WASD
* Maus
* Shift sprinten
* Leertaste springen
* STRG rutschen oder ducken

## Benutzeroberfläche

Minimalistisch.

Beispielsweise:

* FPS-Anzeige optional
* Geschwindigkeit
* Momentum-Anzeige
* kleines Fadenkreuz

## Audio

Füge passende Sounds hinzu:

* Schritte
* Sprünge
* Landungen
* Grinds
* Rutschen
* Windgeräusche

## Performance

Das Spiel soll flüssig laufen.

Nutze sinnvolle Optimierungen wie:

* Frustum Culling
* Instancing
* effiziente Kollisionsberechnung
* modulare Architektur

## Projektstruktur

Das Projekt soll sauber aufgebaut sein.

Beispielsweise getrennt nach:

* Engine
* Renderer
* Physics
* Player
* Movement
* World
* Assets
* Audio
* UI
* Utils

Der Code soll gut lesbar und erweiterbar sein.

## Eigenständige Entscheidungen

Falls etwas nicht spezifiziert wurde, entscheide selbst wie ein erfahrener Spieleentwickler.

Das Ziel ist nicht, möglichst wenig zu implementieren, sondern ein beeindruckendes, hochwertiges Browser-Spiel zu erstellen.

Priorisiere Spielgefühl, flüssige Bewegung, Performance und eine glaubwürdige Stadt.

Erstelle das vollständige Projekt mit allen Dateien, sodass es nach `npm install` und `npm run dev` sofort auf Port 4000 gestartet werden kann.
