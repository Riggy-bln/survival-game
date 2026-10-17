# Sound-Quellen und Lizenzen

Alle Aufnahmen in diesem Ordner stehen unter **CC0 1.0** (Public Domain Dedication): freie Nutzung, auch kommerziell, ohne Namensnennung.
Die Dateien wurden nur zugeschnitten, auf Mono gemischt, auf 48 kHz (Schüsse) bzw. 44,1 kHz (Nachladen) umgerechnet, normalisiert und am Ende ausgeblendet.

## ak47/shot1.wav bis shot6.wav (Gewehrschuss)
- Quelle: "The Free Firearm Sound Library" (Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney; eingestellt von "bart")
- https://opengameart.org/content/the-free-firearm-sound-library (Datei: Prepared SFX Library.7z, Ordner AK-47)
- Echte Aufnahmen einer AK-47 (7,62x39), Einzelschüsse:
  - shot1-4: C_28P.wav (nahe Aufnahme, vier verschiedene Schüsse)
  - shot5-6: C_31P.wav (mittlere Entfernung, zwei Schüsse)
- Lizenz: CC0 ("CC0 NO RIGHTS RESERVED"), http://creativecommons.org/publicdomain/zero/1.0/

## ak47/reload.wav (Nachladen)
- Quelle: "gun reload sounds" von SpringySpringo, Datei assaultriflereload1.wav
- https://opengameart.org/content/gun-reload-sounds
- Hinweis: aufgenommen mit einer Airsoft-Waffe (Sturmgewehr-Nachladen), keine echte AK-47. Für ein authentischeres Geräusch kann die Datei
  einfach gegen eine andere ersetzt werden (gleicher Name, WAV oder in Sound.js den Dateinamen ändern).
- Lizenz: CC0, http://creativecommons.org/publicdomain/zero/1.0/

---

# Weitere Waffen-Sounds

Alle Quellen unten stehen unter **CC0 1.0** (siehe jeweilige Seite). Dateien wurden nur zugeschnitten, auf Mono gemischt, normalisiert und am Ende ausgeblendet,
wo unten nicht anders angegeben. Die Seiten wurden am 17.10.2026 geprüft.

## pistol/shot1.wav bis shot5.wav (Pistolenschuss)
- Quelle: "The Free Firearm Sound Library" (siehe oben), Ordner "Walther PPQ" (9 mm Pistole), Dateien X_39P.wav (nah, drei Schüsse) und X_31P.wav (mittlere Entfernung, zwei Schüsse)
- Echte Aufnahmen. Lizenz: CC0.

## knife/throw1-3.wav (Messerwurf), knife/hit1-3.wav (Einschlag), knife/pickup1-2.wav (Aufheben)
- Quelle: "20 Sword Sound Effects (Attacks and Clashes)" von StarNinjas (aufgenommen, indem zwei Messer gegeneinander bewegt wurden)
- https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes
- throw1-3 = Dateien sword.3, sword.4, sword.6 (kurze Luftgeräusche); hit1-3 = sword_clash.2, .4, .5 (Metallschlag), dazu ein kurzer, in Python erzeugter dumpfer Stoß (Sinuston);
  pickup1-2 = sword_clash.8, .7 (kurzes Klirren, leiser). Die Originale liegen als OGG vor; hier sind sie als WAV gespeichert.
- Lizenz: CC0 (die Autorin bittet um einen Hinweis mit Link auf https://opengameart.org/users/starninjas, das ist freiwillig).

## rocket/launch.wav (Raketenstart)
- Quelle: "Rocket launch" von qubodup, https://opengameart.org/content/rocket-launch (Datei launch.wav, Ausschnitt 1,65 s bis 3,5 s)
- Dazu ein in Python erzeugter tiefer Abschuss-Schlag und ein kurzer Knall (Sinuston und gefiltertes Rauschen), damit der Start wie ein Abschuss klingt.
- Lizenz: CC0.

## rocket/explosion.wav (Explosion der Rakete)
- Quelle: "Muffled Distant Explosion" von NenadSimic, https://opengameart.org/content/muffled-distant-explosion (ein tiefer, dumpfer Knall mit Nachhall)
- Dazu ein in Python erzeugter scharfer Knall und Trümmerrauschen (gefiltertes Rauschen), damit die Explosion nah und kräftig klingt.
- Lizenz: CC0.

## flame/loop.wav, flame/start.wav, flame/end.wav (Flammenwerfer)
- Es gibt keine freie Aufnahme eines echten Flammenwerfers (die gefundenen waren kostenpflichtig). Die Sounds sind deshalb **eine Mischung**:
  - echtes Feuerknistern aus "Fireplace Sound loop" von PagDev, https://opengameart.org/content/fireplace-sound-loop (CC0), Ausschnitt 5 s bis 9 s, für die Schleife nahtlos überblendet;
  - ein in Python erzeugtes, periodisches Gas-Rauschen (gefiltertes Rauschen, 180 bis 3200 Hz, mit langsamem Schwanken) als "Fauchen" und ein Zischen (2,5 bis 9 kHz);
  - für Zünden und Ausgehen ein erzeugter Schlag ("Wumm") bzw. ein abklingendes Fauchen.
- Die Schleife ist genau 3 Sekunden lang und nahtlos (Anfang und Ende passen zusammen). Lizenz der Mischung: CC0 (alle Teile sind CC0 bzw. selbst erzeugt).
- Wer eine echte Aufnahme hat, ersetzt die drei Dateien (gleiche Namen).

## Nicht als Datei: Trockenes "Leer"-Klicken und der Klang beim Finden einer Waffe
- Beide werden im Code erzeugt (Sound.js, 'leer' und 'neueWaffe'). Auch Schrotflinte, Granate und der Rest des Spiels klingen weiter wie bisher (im Code erzeugt).

---

# Treffer-Klänge (nasses Platschen bei Treffern auf Gegner)

## splat/hit1.wav bis hit5.wav (normaler Treffer), splat/death1.wav bis death4.wav (Gegner stirbt)
- Quelle 1: "Squish Sounds Effects" von EZduzziteh, https://opengameart.org/content/squish-sounds-effects (CC0): hit1-5 = squish_01, squish_02, squish_04, squish_06, squishsplat_impact.
  Die Originale sind MP3 (entstanden für ein Käfer-Spiel); hier als WAV gespeichert, zugeschnitten, normalisiert.
- Quelle 2: "8 wet squish, slurp impacts" von Independent.nu (eingestellt von qubodup), https://opengameart.org/node/2547 (CC0, Datei independent_nu_ljudbank-wet_squish_slurp_impacts.7z):
  death1-4 = impactsplat01, 02, 03, 06 (längere, nassere Aufschläge), zugeschnitten (Originale als FLAC).
- Lizenz beider Quellen: CC0 1.0, http://creativecommons.org/publicdomain/zero/1.0/
