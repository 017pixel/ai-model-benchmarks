Erstelle eine hochwertige, interaktive 3D-Webanwendung mit Three.js, die ein plausibles, platzoptimiertes und vollständig vernetztes „Haus der Zukunft“ visualisiert.

Die Anwendung soll direkt im Browser laufen und das Haus sowohl von außen als auch von innen detailliert darstellen. Der Nutzer soll das Gebäude frei erkunden, Stockwerke einblenden und ausblenden, Räume untersuchen und einzelne technische Systeme anklicken können.

## Grundidee

Heutige Wohnhäuser sind häufig nicht optimal auf begrenzten Raum, moderne Technik, steigende Energiekosten und zukünftige KI-Systeme vorbereitet.

Das entworfene Haus soll folgende Ziele verbinden:

1. Hohe Platzeffizienz
2. Komfortabler Lebensraum
3. Lokale KI und Smart-Home-Automatisierung
4. Hohe Sicherheit und Privatsphäre
5. Eigene Energieerzeugung und Energiespeicherung
6. Lokale Server und Datenspeicherung
7. Zukunftsfähige Arbeits- und Wohnbereiche
8. Modularer und kompakter Aufbau, ohne beengt zu wirken

Das Ergebnis soll kein Science-Fiction-Raumschiff sein. Es soll wie ein realistisches, modernes Haus aussehen, das mit heute verfügbarer oder in naher Zukunft realistischer Technik gebaut werden könnte.

## Technische Umsetzung

Verwende:

* Three.js
* JavaScript oder TypeScript
* Vite als Entwicklungsumgebung
* Saubere, modulare Projektstruktur
* Physically Based Rendering Materialien
* Realistische Beleuchtung
* Weiche Schatten
* Ambient Occlusion
* Tone Mapping
* HDRI oder realistische Umgebungsbeleuchtung
* Optimierte Geometrien und Texturen
* Responsive Darstellung für Desktop und Tablet

Die Anwendung muss sich mit folgendem Befehl starten lassen:

```bash
npm run dev
```

Nutze für die Entwicklung Port 4000.

## Kamerasteuerung und Navigation

Die Anwendung soll mehrere Kameramodi besitzen:

### Außenansicht

* Freie Orbit-Steuerung um das Gebäude
* Zoomen und Drehen
* Leicht erhöhte Standardperspektive
* Gute Sicht auf Dach, Solaranlage und Fassade

### Innenansicht

* First-Person- oder Walkthrough-Modus
* Bewegung durch die Räume
* Kollisionsschutz, damit der Nutzer nicht durch Wände läuft
* Türen sollen sich öffnen lassen
* Treppen müssen benutzbar sein

### Architekturansicht

* Explosionsansicht des Gebäudes
* Stockwerke vertikal auseinanderziehen
* Erdgeschoss, Obergeschoss, Technikdachboden und Dach einzeln einblenden oder ausblenden
* Schnittansicht, bei der eine Gebäudeseite ausgeblendet wird
* Optional eine Draufsicht auf den Grundriss

Zwischen den Kameramodi soll man über eine übersichtliche Benutzeroberfläche wechseln können.

## Gebäudeform

Das Haus soll eine klare, rechteckige Grundform haben.

Es besteht aus:

1. Erdgeschoss
2. Obergeschoss
3. Technikdachboden
4. Flachdach mit Solaranlage

Das Haus soll kompakt wirken, aber nicht klein oder beengt. Nutze hohe Decken, große Fenster, offene Sichtachsen und eine intelligente Raumaufteilung.

Die Architektur soll modern, minimalistisch und realistisch sein.

## Farbgebung und Materialdesign

Verwende hauptsächlich:

* Helle weiße Wandflächen
* Warmes Weiß für Innenräume
* Mattes Schwarz als Akzentfarbe
* Helles Holz für Böden, Tische und einzelne Möbel
* Glas
* Metall
* Dunkelgraue technische Oberflächen
* Dezente grüne Akzente durch Pflanzen

Vermeide starke Neonfarben und übertrieben futuristische Formen.

Das Haus soll hochwertig, ruhig, hell und modern wirken.

## Erdgeschoss

Das Erdgeschoss wird durch einen kreuzförmigen Grundriss in vier Hauptbereiche gegliedert.

### 1. Eingangsbereich

Der Eingangsbereich liegt im vorderen Teil des Hauses.

Er enthält:

* Moderne Eingangstür
* Kleine überdachte Außenfläche
* Schuhregale
* Geschlossene Schränke für Jacken und Kleidung
* Ablagen für Schlüssel und Kleinigkeiten
* Sitzbank zum Anziehen von Schuhen
* Spiegel
* Dezente Smart-Home-Anzeige
* Treppe zum Obergeschoss
* Sensoren für Bewegung, Temperatur und Sicherheit

Der Bereich soll ordentlich, funktional und nicht überladen wirken.

### 2. Küche und Essbereich

Links vom Eingangsbereich befindet sich eine moderne Küche mit Essbereich.

Die Küche enthält:

* Große Kücheninsel
* Induktionskochfeld
* Backofen
* Kühlschrank
* Spülmaschine
* Stauraum
* Matte schwarze Armaturen
* Helle Schrankflächen
* Arbeitsplatten aus Stein oder hochwertigem Verbundmaterial
* Intelligente Beleuchtung
* Sensoren und Smart-Home-Steuerung

Der Essbereich enthält:

* Esstisch für mindestens sechs Personen
* Moderne Stühle
* Pendelleuchte oder eingelassene Deckenbeleuchtung
* Pflanzen
* Große Fenster

Eine Tür oder breite Öffnung führt von der Küche in das Wohnzimmer.

### 3. Wohnzimmer

Das Wohnzimmer soll gemütlich, modern und technisch hochwertig sein.

Es enthält:

* Großes Sofa
* Mehrere große Sitzsäcke
* Teppich
* Großen Fernseher
* Soundsystem mit mehreren im Raum verteilten Lautsprechern
* Regale
* Stauraum
* Pflanzen
* Große Fenster
* Indirekte Beleuchtung
* Automatische Verdunkelung
* Smart-Home-Bedienung

Vom Wohnzimmer führt eine weitere Tür zum Schlafzimmer.

### 4. Schlafzimmer

Das Schlafzimmer enthält:

* Doppelbett
* Zwei Nachttische
* Kleiderschrank
* Regale
* Kleine Sportecke
* Kleine Hanteln
* Sportmatte
* Ablage für Sportzubehör
* Kleinen Tisch oder Sideboard mit Ladestationen
* Kabelloses Laden für Smartphone, Smartwatch und Kopfhörer
* Sichere Ladefläche für Laptop und andere Geräte
* Automatische Beleuchtung
* Temperatursteuerung
* Verdunkelbare Fenster

Der Raum soll ruhig und aufgeräumt wirken.

## Obergeschoss

Das Obergeschoss soll deutlich offener gestaltet sein als das Erdgeschoss.

Es besteht aus zwei Hauptbereichen.

### 1. Treppen- und Verbindungsraum

Dieser Raum liegt über dem Eingangsbereich.

Er enthält:

* Treppe zum Erdgeschoss
* Zugang zum großen Arbeits- und Aufenthaltsbereich
* Sicheren Zugang zum Technikdachboden
* Kleine Wandbeleuchtung
* Schmale Stauraumelemente
* Smart-Home-Bedienfeld

Der Zugang zum Dachboden soll klar erkennbar, aber im normalen Alltag unauffällig integriert sein.

### 2. Großer Arbeits- und Aufenthaltsbereich

Der restliche Teil des Obergeschosses ist ein großer, offener Raum, der sich über mehrere Bereiche des Grundrisses und um eine Gebäudeecke erstreckt.

Dieser Raum ist eine Kombination aus:

* Arbeitszimmer
* Lernbereich
* Aufenthaltsraum
* Kreativbereich
* Bibliothek
* Entspannungsbereich

Eine Gebäudeecke soll ein großes, zusammenhängendes Eckfenster besitzen. Das Fenster soll über zwei Außenwände verlaufen und viel Tageslicht hineinlassen.

Der Raum enthält:

* Große Regalwand
* Bücher
* Arbeitsmaterialien
* Technikzubehör
* Stauraum
* Elektrisch höhenverstellbaren Standing Desk direkt am Fenster
* Hochwertigen Bürostuhl
* Mac Studio
* Drei große Displays
* Tastatur
* Maus
* MacBook
* Dockingstation
* Lautsprecher
* Mikrofon
* Schreibtischbeleuchtung
* Kabelmanagement
* Mehrere Ladeflächen
* Sofa
* Großen Teppich
* Mehrere große Sitzsäcke
* Pflanzen
* Akustikelemente
* Indirekte Beleuchtung

Das Setup soll hochwertig und realistisch wirken. Die Technik darf nicht wie zufällig platzierte Rechtecke aussehen. Monitore, Anschlüsse, Kabel, Tischgestell und Geräte sollen sauber modelliert und sinnvoll angeordnet sein.

## Technikdachboden

Der Dachboden ist vollständig für die Haustechnik vorgesehen. Normale Bewohner betreten ihn nur selten.

Der Raum soll technisch, aufgeräumt und realistisch gestaltet sein.

Er enthält:

* Mehrere Server-Racks
* Lokale KI-Server
* Netzwerkspeicher
* Router
* Switches
* Firewall-Hardware
* Backup-Systeme
* Hausinterne Netzwerkverteilung
* Steuergeräte für das Smart Home
* Solarbatterien
* Wechselrichter
* Stromverteilung
* Notstromsystem
* Klimaanlage
* Luftfilter
* Temperatur- und Feuchtigkeitssensoren
* Rauchmelder
* Automatisch gesteuerte Fenster
* Lüftungskanäle
* Kabelkanäle
* Wartungszugänge

Alle Kabel sollen geordnet durch Kabelkanäle verlaufen. Der Raum darf nicht chaotisch wirken.

Die Server-Racks sollen Statusleuchten besitzen. Vermeide dabei übertriebene RGB-Beleuchtung. Nutze kleine, realistische Statusanzeigen.

Die Klimaanlage und Fenster werden von der lokalen Haus-KI gesteuert. Je nach Außentemperatur, Luftfeuchtigkeit und Serverlast soll automatisch zwischen natürlicher Belüftung und aktiver Kühlung gewechselt werden.

## Lokale Haus-KI

Das Haus besitzt eine vollständig lokale KI.

Diese KI verwaltet:

* Beleuchtung
* Temperatur
* Klimaanlage
* Lüftung
* Fenster
* Türen
* Sicherheitssysteme
* Energieverbrauch
* Solaranlage
* Batteriespeicher
* Geräte
* Server
* Netzwerk
* Wartungshinweise
* Raumbelegung
* Luftqualität
* Wasserverbrauch

Die KI dient den Bewohnern außerdem als lokaler Assistent und Chatbot.

Private Daten sollen das Haus standardmäßig nicht verlassen. Verarbeitung, Datenspeicherung und Haussteuerung erfolgen lokal auf den eigenen Servern.

Visualisiere dieses System in der Webanwendung durch ein interaktives Kontrollpanel.

Das Kontrollpanel zeigt beispielsweise:

* Aktuelle Solarleistung
* Ladezustand der Batterien
* Stromverbrauch des Hauses
* Serverauslastung
* Temperaturen
* Luftqualität
* Netzwerkstatus
* Sicherheitsstatus
* Aktive Geräte
* Geschätzte Energieautarkie

## Freiwillige Freigabe von Rechenleistung

Die Bewohner können freiwillig einen Teil der ungenutzten Serverleistung externen Unternehmen zur Verfügung stellen.

Dies geschieht hauptsächlich nachts oder während geringer lokaler Auslastung.

Mögliche Nutzung:

* Training von KI-Modellen
* Verteilte Berechnungen
* Wissenschaftliche Rechenaufgaben
* Rendering
* Datenverarbeitung

Diese Funktion muss standardmäßig deaktiviert sein.

Der Nutzer muss sie bewusst aktivieren können.

Das System soll folgende Informationen anzeigen:

* Freigegebene Rechenleistung
* Geschätzter zusätzlicher Stromverbrauch
* Vergütung
* Aktive Rechenaufträge
* Temperatur der Server
* Maximale erlaubte Auslastung
* Zeitfenster
* Datenschutzstatus
* Möglichkeit zum sofortigen Stoppen

Die externen Rechenaufgaben dürfen keinen Zugriff auf private Daten, das lokale Netzwerk oder die Haussteuerung erhalten. Stelle visuell dar, dass diese Prozesse technisch voneinander isoliert sind.

## Dach und Solaranlage

Das Haus besitzt ein flaches, gerades Dach.

Die Dachfläche soll möglichst vollständig für Solarenergie genutzt werden.

Auf dem Dach befinden sich:

* Viele Solarpanels
* Panels in geordneten Reihen
* Ungefähr 30 bis 45 Grad Neigungswinkel
* Wartungswege
* Blitzschutz
* Kabelwege zum Wechselrichter
* Regenwasserablauf
* Sensoren für Wetter und Sonneneinstrahlung

Die Solarpanels sollen realistische Materialien, leichte Spiegelungen, sichtbare Zellstrukturen und stabile Halterungen besitzen.

Die Ausrichtung der Panels soll sinnvoll zur simulierten Sonnenrichtung passen.

## Beleuchtung

Verwende ein realistisches Tag- und Nacht-System.

Am Tag:

* Natürliches Sonnenlicht
* Licht durch große Fenster
* Weiche Schatten
* Helle, freundliche Innenräume

Am Abend:

* Warmes Innenlicht
* Indirekte Beleuchtung
* Deckenleuchten
* Arbeitsplatzbeleuchtung
* Dezente Außenbeleuchtung

In der Nacht:

* Reduzierte Beleuchtung
* Sichtbare Server-Statusanzeigen
* Automatische Sicherheitsbeleuchtung
* Aktivität der Batteriespeicher und Server

Der Nutzer soll die Tageszeit über die Benutzeroberfläche verändern können.

## Smart-Home-Interaktionen

Mindestens folgende Elemente sollen interaktiv sein:

* Türen öffnen und schließen
* Fenster öffnen und schließen
* Lampen ein- und ausschalten
* Jalousien steuern
* Raumtemperatur ändern
* Standing Desk hoch- und herunterfahren
* Displays am Arbeitsplatz aktivieren
* Fernseher einschalten
* Server-Racks auswählen
* Solaranlage untersuchen
* Batteriespeicher auswählen
* Externe Rechenleistung aktivieren und deaktivieren
* Stockwerke einblenden und ausblenden
* Haus-KI-Kontrollpanel öffnen

Beim Anklicken eines Elements soll ein kleines Informationsfenster erscheinen.

## Benutzeroberfläche

Die Benutzeroberfläche soll modern, minimalistisch und leicht verständlich sein.

Sie enthält:

* Auswahl des Kameramodus
* Auswahl der Etage
* Tag- und Nacht-Regler
* Energieübersicht
* Smart-Home-Steuerung
* Raumübersicht
* Technikinformationen
* Schaltfläche für Explosionsansicht
* Schaltfläche für Gebäudeschnitt
* Vollbildmodus
* Zurücksetzen der Kamera

Die Benutzeroberfläche darf die 3D-Ansicht nicht unnötig verdecken.

Verwende halbtransparente Panels, klare Typografie, matte schwarze Flächen und helle Schrift.

## Modellierungsqualität

Die 3D-Modelle sind ein zentraler Bestandteil des Projekts.

Erstelle keine groben Platzhaltermodelle.

Achte besonders auf:

* Realistische Proportionen
* Wandstärken
* Türrahmen
* Fensterrahmen
* Treppengeländer
* Möbelbeine
* Schubladen
* Griffe
* Steckdosen
* Lichtschalter
* Kabelkanäle
* Monitorhalterungen
* Lüftungsöffnungen
* Server-Racks
* Solarpanelhalterungen
* Technische Anschlüsse
* Kleine architektonische Details

Nutze wiederverwendbare Komponenten für mehrfach vorkommende Objekte.

## Pflanzen und Dekoration

Im gesamten Haus sollen Pflanzen sinnvoll verteilt sein.

Nutze:

* Große Bodenpflanzen
* Kleinere Pflanzen auf Regalen
* Pflanzen nahe großer Fenster
* Dezente Dekoration
* Bücher
* Bilder
* Textilien
* Kissen
* Teppiche

Die Räume sollen bewohnt wirken, aber nicht unordentlich.

## Umgebung

Erstelle eine kleine, moderne Außenumgebung.

Sie enthält:

* Zufahrt
* Gehweg
* Kleine Terrasse
* Grünfläche
* Bäume
* Sträucher
* Außenbeleuchtung
* Briefkasten
* Mülltonnen oder versteckten Müllbereich
* Regenwasserableitung
* Optional eine Ladestation für ein Elektrofahrzeug

Die Umgebung soll das Haus unterstützen und nicht von ihm ablenken.

## Performance

Die Anwendung soll auch bei hoher Modellqualität flüssig laufen.

Nutze:

* Instancing für wiederkehrende Objekte
* Level of Detail
* Texture Atlases
* Komprimierte Texturen
* Lazy Loading
* Frustum Culling
* Begrenzte Schattenauflösung
* Optimierte Lichtquellen
* Wiederverwendbare Materialien
* Zusammengefasste statische Geometrien

Zeige während des Ladens einen hochwertigen Ladebildschirm mit Fortschrittsanzeige.

## Projektstruktur

Trenne das Projekt mindestens in folgende Bereiche:

* Szene
* Hausgeometrie
* Räume
* Möbel
* technische Systeme
* Solaranlage
* Beleuchtung
* Kamerasteuerung
* Interaktionen
* Benutzeroberfläche
* Zustandsverwaltung
* Assets
* Performance-Optimierung

Vermeide eine einzelne, riesige JavaScript-Datei.

## Erwartetes Endergebnis

Das Endergebnis soll wie eine interaktive Architekturvisualisierung eines realistisch umsetzbaren Zukunftshauses wirken.

Es soll:

* Optisch hochwertig sein
* Technisch plausibel wirken
* Vollständig begehbar sein
* Viele sinnvolle Interaktionen besitzen
* Die Raumaufteilung klar darstellen
* Das lokale KI-System verständlich visualisieren
* Solarenergie und Batteriespeicherung zeigen
* Die lokale Serverinfrastruktur detailliert darstellen
* Auf Desktop und Tablet gut funktionieren
* Direkt mit `npm run dev` auf Port 4000 startbar sein

Priorisiere eine saubere Architektur, hochwertige 3D-Modelle, realistische Materialien, gute Beleuchtung und eine verständliche Nutzerführung. Reduziere den Umfang einzelner Funktionen, falls nötig, aber ersetze zentrale Räume und technische Systeme nicht durch einfache Platzhalter.
