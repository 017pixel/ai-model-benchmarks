# Pacifica Drive

Eine prozedurale Open-World-Grafikstudie für den Browser. Die komplette Stadt, ihre PBR-Oberflächen, Architekturdetails, Vegetation, Fahrzeuge und Küste werden lokal erzeugt; es gibt keine Laufzeitabhängigkeit von externen Asset-CDNs.

## Start

```bash
npm install
npm run dev
```

Der Produktions-Build wird mit `npm run build` erstellt.

## Steuerung

- `WASD` oder Pfeiltasten: Fahren und lenken
- `Space`: Handbremse
- `C`: Kamera wechseln
- Touch-Geräte: eingeblendete Lenk- und Pedalsteuerung

## Rendering

- Physically Based Rendering mit prozeduralen Albedo-, Normal-, Roughness- und AO-ähnlichen Oberflächendetails
- ACES Filmic Tone Mapping und PMREM-Umgebungslicht
- GTAO mit bilateralem Denoising
- Selektive Screen-Space Reflections für Fahrzeug, Straßen und Wasser
- SMAA, emissives Bloom, dynamische weiche Schatten und atmosphärischer Himmel
- Automatische Qualitätswahl über Gerätetyp, Speicher und Pixeldichte
- Laufzeit-Degradierung, falls die Ziel-Framerate nicht gehalten wird

WebGPU stellt in verbreiteten Browsern keine standardisierte Hardware-Raytracing-Pipeline bereit. Die Anwendung nutzt deshalb die stabilere WebGL2-Pipeline mit Screen-Space-Techniken. Die Rendering-Qualität lässt sich zu Diagnosezwecken mit `?quality=ultra`, `?quality=high` oder `?quality=balanced` festlegen. `?post=off` aktiviert einen direkten Renderer-Pfad für Software-GPU-Tests.
