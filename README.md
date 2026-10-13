# Survival Game

Ein 2D-Action-Survival-Spiel im Browser (Phaser 3, JavaScript). Level 01: Verlassene Militärzone.

## Steuerung
- **A / D** oder Pfeiltasten: Laufen, **Leertaste**: Springen
- **Maus**: Zielen, **linke Maustaste**: Schießen (gedrückt halten = Dauerfeuer)
- **R**: Nachladen, **H**: Verbandskasten, **G**: Granate
- **Esc**: Pause, **N**: Ton an/aus, **Enter**: Neustart nach Sieg oder Niederlage

## Lokal starten
```
python3 server.py
```
Dann http://localhost:8001 öffnen. (Direktes Öffnen von `index.html` funktioniert nicht, weil der Browser ES-Module von `file://` blockiert.)

## Technik
Phaser 3.80 (liegt in `libs/`), Arcade-Physik, ES-Module. Alle Grafiken und Sounds werden im Code erzeugt, es gibt keine Bild- oder Audiodateien.
