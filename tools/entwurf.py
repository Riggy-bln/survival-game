# Das Spieldesign für das erste Drittel: Gegner, Gegenstände, Leitern, Brücken, Fahnen und Hinweise auf dem Gelände aus der Skizze.
# Koordinaten sind Zellen der Skizze: cx = Spalte, r = Zeile der Oberseite der Fläche, auf der etwas steht (siehe Bau in level_aus_karte.py).
#
# DER BOGEN DES ERSTEN DRITTELS (nach dem Prinzip "zeigen, ausprobieren, steigern, belohnen, durchatmen"):
#
#  Akt 1  Landung        (Spalte -1 bis 33)   Start, Sprung über die erste Schlucht, der erste Hof: zwei schwache Soldaten rechts und links von einem
#                                             Sprengfass (die erste Explosion belohnt sofort), ein Schütze hinter Sandsäcken, Heilung und Fahne.
#  Akt 2  Schluchten     (34 bis 48)          Zwei Sprünge über Schluchten, erster Bogenschütze: lernen, Pfeilen auszuweichen. Heilung als Belohnung.
#  Akt 3  Das Feld       (49 bis 67)          Das erste große Gefecht auf offener Fläche mit Fässern und Deckung. Belohnung: das Sturmgewehr.
#  Akt 4  Abstieg        (68 bis 97)          Eine Treppe nach unten: wenige Gegner, viele Gegenstände (Durchatmen), Fahne am Fuß.
#  Akt 5  Aufstieg       (98 bis 113)         Klettern unter Beschuss (die Leitern), oben wartet das Aussichtsplateau mit der ersten großen Fahne.
#         Der Tresor     (46 bis 97 unten)    Ein langer, dunkler Gang für Neugierige: schwerer Wächter, Fässer, dafür das Schwert und viel Beute.
#         Himmelsroute   (19 bis 107 oben)    Eine lange Leiter führt zu schwebenden Inseln: schwieriger, aber mit Schrotflinte und Beute.
#  Akt 6  Gipfelruhe     (114 bis 121)        Die große Fahne, Beute, Aussicht: Atempause vor den Brücken.
#  Akt 7  Brücken        (122 bis 146)        Über Planken ohne Geländer, ein Scharfschütze auf der Insel in der Mitte.
#  Akt 8  Die Festung    (147 bis 190)        Drei Wege: oben über die Außenwerke, unten durch den Tunnel, hoch über die Himmelsroute (Scharfschützen).
#  Akt 9  Der Kessel     (191 bis 233)        Eine Senke mit Schützen oben auf der Himmelsroute und einem schweren Wächter unten, dann die Schlusskletterei.
#  Akt 10 Die Landezone  (234 bis 257)        Fahne, Atempause, letzter Kampf um den Hubschrauber.
#
# Regeln für die Zahlen: Normale Gegner haben 3 Lebenspunkte (der erste Hof nur 2), schwere Wächter 8. Nach jedem Gefecht liegt Munition,
# nach jedem zweiten Heilung. Nie zwei Spitzen (schwere Gefechte) direkt hintereinander: dazwischen immer ein Atemzug. Fahnen etwa alle
# 40 Zellen, jeweils nach dem überstandenen Gefecht und vor dem nächsten.

# ---------------------------------------------------------------- Bauwerke, Kriegsüberreste und Landschaftsschmuck
# Die Gebäude entstehen aus Blöcken (vor dem Erzeugen der Platten), siehe tools/bauwerke.py. Wo sie stehen, hat das Gelände der Skizze genug freie Höhe.
#   (Häuser in den Höhlen gibt es aktuell nicht: Festung und Hütte wurden entfernt.)
#   Wachtürme (zerstörbar) am ersten Hof und auf der zweiten Klippe: Schützen oben, man kann ein Bein wegschießen
# Dazu Dekoration: Panzerwracks (als Deckung begehbar), Panzersperren, Stacheldraht, brennende Tonnen, ein abgestürzter Hubschrauber, Mauerreste,
# Gräber, ein Zelt am Start und zerfetzte Banner. Sie erzählen: Hier war eine Schlacht; je näher am Ziel, desto mehr Trümmer und Feuer.
FESTUNG = KESSEL = None

def bauwerke(daten, bloecke):
    global FESTUNG, KESSEL
    from bauwerke import haus
    # (Die Häuser in den Höhlen - Festung und Hütte - wurden entfernt. Das Gebäudewerkzeug bleibt: haus(daten, bloecke, c0, r0, c1, r1, H).)
    return

def entwerfe(b):
    b.ziel = (255, -7)
    verbindungen(b)
    akt1(b); akt2(b); akt3(b); akt4(b); akt5(b)
    tresor(b); himmelsroute(b)
    akt6(b); akt7(b); akt8(b); akt9(b); akt10(b)
    schmuck(b)

def verbindungen(b):
    """Leitern und Brücken setzt der Spieler selbst im Karteneditor (Werkzeuge 'Ladder' und 'Wooden floor'): Der Generator übernimmt sie aus der Skizze.
    Früher standen hier meine Vorschläge für die Verbindungen; sie sind unten als Kommentar aufbewahrt (Spalte, Zeile) und werden NICHT mehr gebaut."""
    return

# Die früheren Vorschläge (nicht mehr aktiv):
#     def verbindungen(b):
#         """Damit alles erreichbar ist: Leitern an hohen Wänden, Holzbrücken über zu breite Lücken. (Das Gelände selbst ist unverändert.)"""
#         # Treppe zum Aussichtsplateau (erste große Fahne): Stufen von vier Zellen Höhe sind zu hoch zum Springen, dort hängen Leitern
#         b.leiter(107, 12, 16, +1)
#         b.leiter(111, 4, 8, +1)
#         b.leiter(112, 0, 4, +1)
#         # Der Aufstieg zu den Himmelsinseln: eine lange Leiter vom ersten Hof (Spalte 18) hinauf
#         b.leiter(18, -9, 5, +1)
#         # Der Rückweg aus der Nische unter dem Startplateau: Steg und Leiter hinauf zum ersten Hof
#         b.planke(11, 13, 8); b.leiter(13, 5, 8, +1)
#         # Schluchten, die zu breit sind
#         b.planke(35, 37, 5)
#         # Obere Route: von der Mittelplattform zum ersten Aussichtsplateau (sechs Zellen Lücke)
#         b.planke(109, 110, -2); b.planke(112, 113, -2)
#         # Hinter der ersten großen Fahne: Schlucht (neun Zellen) und zweite Schlucht (sieben Zellen)
#         b.planke(123, 124, -2); b.planke(126, 127, -2); b.planke(129, 130, -2)
#         b.planke(141, 142, -2); b.planke(144, 145, -2)
#         # Aufstieg zur Himmelsroute über der Festung (Leiter an der Treppe aus Erde) und Ende des Oberflächenwegs (zehn Zellen Lücke)
#         b.leiter(153, -10, -2, +1); b.leiter(156, -13, -10, +1)
#         b.planke(189, 190, 3); b.planke(192, 193, 4); b.planke(195, 196, 4)
#         b.leiter(194, 5, 10, +1)
#         # Schlusskletterei und die Lücke vor der Landezone
#         b.leiter(232, -6, 0, +1)
#         b.planke(243, 244, -7)
#

# ---------------------------------------------------------------- Akt 1: Landung
def akt1(b):
    b.schild(3, 0, 'Move: A / D\nJump: Space')
    b.item('ammo', 6, 0)                                   # gleich am Anfang etwas zum Mitnehmen
    b.schild(8, 0, 'Aim with the mouse\nShoot: left click')
    # Die Nische unter dem Startplateau (Geheimnis): wer in die Schlucht schaut, findet Beute
    b.item('health', 7, 8); b.item('grenade', 9, 8); b.item('ammo', 8, 8)
    # Der erste Hof: Belohnung zuerst, dann der Kampf
    b.item('ammo', 16, 5)
    # (der erste Wachturm am Hof wurde entfernt)
    b.soldat(22, 5, hp=2, links=19, rechts=23)             # zwei SCHWACHE Soldaten, ein Fass genau dazwischen:
    b.fass(24, 5)                                          # die erste Explosion erledigt beide und fühlt sich großartig an
    b.soldat(26, 5, hp=2, links=25, rechts=28)
    b.deckung(29, 5, breite=2, art='sand')
    b.schuetze(31, 5, hp=2, links=31, rechts=32)           # ein Schütze hinter Sandsäcken
    b.item('health', 28, 5)
    pass  # Fahne (33, 5) entfernt: Checkpoints stehen dort, wo sie in der Skizze eingezeichnet sind
    b.item('grenade', 32, 5)

# ---------------------------------------------------------------- Akt 2: Schluchten
def akt2(b):
    b.item('health', 40, 5)                                # Belohnung für den ersten Sprung über die breite Schlucht
    b.skelett(47, 4, hp=3, links=47, rechts=48)            # erster Bogenschütze auf der anderen Seite
    b.item('ammo', 46, 5)

# ---------------------------------------------------------------- Akt 3: Das Feld
def akt3(b):
    pass  # Fahne (50, 3) entfernt: Checkpoints stehen dort, wo sie in der Skizze eingezeichnet sind
    b.item('ammo', 51, 3)
    b.schild(52, 3, 'Barrels explode:\nshoot them from a distance', hoch=110)
    b.soldat(54, 3, links=53, rechts=56); b.fass(55, 3); b.soldat(56, 3, links=55, rechts=56)
    b.fass(61, 3); b.soldat(65, 3, links=64, rechts=66)                                  # (zwischen den Soldaten steht das Panzerwrack, siehe schmuck)
    b.item('health', 65, 3); b.item('grenade', 64, 3)
    b.item('rifle', 66, 3)                                 # das Sturmgewehr: die große Belohnung nach dem ersten richtigen Kampf
    b.item('ammo', 67, 3)

# ---------------------------------------------------------------- Akt 4: Abstieg (Durchatmen)
def akt4(b):
    b.item('ammo', 69, 4)
    b.soldat(72, 7, links=72, rechts=73)
    b.skelett(78, 8, links=75, rechts=80); b.fass(76, 8)
    b.item('health', 82, 9); b.item('ammo', 83, 9)
    b.soldat(86, 11, links=85, rechts=87); b.schuetze(89, 11, links=88, rechts=91)
    b.item('ammo', 93, 12)
    pass  # Fahne (95, 12) entfernt: Checkpoints stehen dort, wo sie in der Skizze eingezeichnet sind
    b.item('health', 96, 12)

# ---------------------------------------------------------------- Akt 5: Aufstieg unter Beschuss
def akt5(b):
    b.schild(99, 19, 'Climb up: W / S\nWatch out for the archer!', hoch=110)
    b.item('ammo', 100, 19); b.item('health', 102, 19)
    b.skelett(110, 9, links=110, rechts=110)               # auf den Stufen der Treppe: Kletterer sind leichte Ziele, deshalb nur schwache Schützen
    b.schuetze(112, 4, links=112, rechts=112)
    b.soldat(113, 0, links=113, rechts=113)

# ---------------------------------------------------------------- Der Tresor (langer Gang unten)
def tresor(b):
    b.hoehle(46, 107, 15, 19, art='tunnel', stil='feucht')
    for cx in (52, 62, 72, 82, 92, 100):
        b.lampe(cx, 15)
    b.schild(96, 20, 'The vault:\nrisky, but it pays off', hoch=120)
    b.soldat(90, 20, links=84, rechts=96); b.skelett(86, 20, links=84, rechts=96)
    b.schuetze(80, 20, links=76, rechts=82)
    b.fass(76, 20); b.fass(70, 20)
    b.schwer(73, 20, hp=8, links=66, rechts=76)            # der schwere Wächter in der Mitte
    b.soldat(64, 20, links=60, rechts=66); b.skelett(61, 20, links=60, rechts=65)
    b.item('ammo', 78, 20); b.item('health', 68, 20)
    b.soldat(56, 19, links=48, rechts=58); b.schuetze(51, 19, links=47, rechts=53)
    b.item('sword', 48, 19)                                # das Schwert am Ende des Gangs
    b.item('health', 47, 19); b.item('health', 49, 19); b.item('ammo', 50, 19); b.item('grenade', 52, 19)

# ---------------------------------------------------------------- Die Himmelsroute (links oben)
def himmelsroute(b):
    b.item('shotgun', 24, -10)                             # Schrotflinte als Belohnung für den langen Aufstieg
    b.item('health', 26, -10); b.item('ammo', 28, -10)
    b.skelett(30, -10, links=29, rechts=31)
    b.skelett(44, -9, links=43, rechts=45); b.item('grenade', 46, -10)
    b.soldat(60, -13, links=59, rechts=64); b.item('ammo', 62, -13)
    b.soldat(70, -10, links=67, rechts=75); b.schuetze(76, -10, links=75, rechts=78)
    b.item('health', 72, -10)
    b.skelett(85, 4, links=84, rechts=86); b.item("ammo", 88, 2)
    b.item('grenade', 99, -2); b.schuetze(103, -2, links=100, rechts=105); b.fass(101, -2)

# ---------------------------------------------------------------- Akt 6: Gipfelruhe
def akt6(b):
    # die große Fahne bei Spalte 117 stammt aus der Skizze
    b.item('health', 115, -2); b.item('ammo', 116, -2); b.item('grenade', 118, -2)
    b.schild(120, -2, 'A broken bridge ahead.\nJump from plank to plank!', hoch=110)

# ---------------------------------------------------------------- Akt 7: Brücken
def akt7(b):
    b.skelett(136, -2, hp=3, links=134, rechts=138)        # der Scharfschütze auf der Insel
    b.fass(135, -2); b.soldat(138, -2, links=137, rechts=139)
    x2, o2 = b.wachturm(132, -2, 224, +1)                                                  # Wachturm an der Klippe: er deckt die Brücke
    b.gegner_xy(b.skelette, x2, o2, x2 - 40, x2 + 40, 3)
    b.item('ammo', 135, -2); b.item('health', 136, -2)

# ---------------------------------------------------------------- Akt 8: Die Festung
def akt8(b):
    pass  # Fahne (149, -2) entfernt: Checkpoints stehen dort, wo sie in der Skizze eingezeichnet sind
    b.item('ammo', 150, -2); b.item('health', 151, -2)
    b.schild(152, -2, 'Three ways on:\nsurface, tunnel or sky', hoch=120)
    # Oberfläche: die Außenwerke
    b.soldat(155, -2, links=154, rechts=157); b.fass(158, -2); b.soldat(160, -2, links=158, rechts=162)
    # Die Festung (in der Höhle): enger Kampf auf dem Höhlenboden. (Das Haus darin wurde entfernt.)
    b.soldat(166, 0, links=165, rechts=168); b.fass(170, 0); b.schuetze(172, 0, links=171, rechts=173)
    b.item('health', 167, 0); b.item('grenade', 169, 0); b.item('ammo', 164, 0)
    b.schwer(177, 2, hp=8, links=175, rechts=178)          # der schwere Wächter der Festung
    b.skelett(182, 3, links=180, rechts=185); b.item('ammo', 183, 3); b.item('health', 185, 3)
    # Tunnel
    b.hoehle(156, 190, 9, 13, art='tunnel', stil='staubig')
    for cx in (162, 172, 182):
        b.lampe(cx, 9)
    b.soldat(163, 13, links=160, rechts=166); b.fass(168, 13); b.schuetze(171, 13, links=169, rechts=175)
    b.soldat(179, 13, links=176, rechts=184); b.item('ammo', 165, 13); b.item('health', 187, 13)
    # Himmelsroute: Scharfschützen auf dem hohen Deck
    b.item('health', 160, -16); b.skelett(166, -16, links=163, rechts=169); b.skelett(176, -16, links=172, rechts=180)
    b.soldat(184, -16, links=181, rechts=188); b.item('grenade', 189, -16); b.item('ammo', 190, -16)

# ---------------------------------------------------------------- Akt 9: Der Kessel
def akt9(b):
    pass  # Fahne (199, 3) entfernt: Checkpoints stehen dort, wo sie in der Skizze eingezeichnet sind
    b.item('ammo', 198, 3); b.item('health', 200, 3)
    b.schuetze(203, 3, links=201, rechts=204)
    b.soldat(208, 4, links=206, rechts=212); b.fass(210, 4); b.soldat(212, 4, links=211, rechts=212)
    b.schwer(219, 4, hp=8, links=218, rechts=221)          # der schwere Wächter des Kessels
    b.schuetze(222, 4, links=220, rechts=223)
    b.item('health', 207, 4); b.item('ammo', 209, 4)
    # Die Himmelsroute über dem Kessel: Schützen, die nach unten schießen
    b.skelett(205, -12, links=200, rechts=208); b.skelett(212, -12, links=209, rechts=216)
    b.item('health', 199, -12); b.item('ammo', 215, -12); b.item('grenade', 216, -12)
    b.skelett(222, -8, links=220, rechts=224)
    b.item('ammo', 226, 2); b.item('health', 228, 2)
    b.soldat(230, 1, links=230, rechts=231)

# ---------------------------------------------------------------- Akt 10: Die Landezone
def akt10(b):
    # die Fahne bei Spalte 237 stammt aus der Skizze
    b.item('health', 235, -7); b.item('ammo', 236, -7); b.item('grenade', 239, -7)
    b.schild(238, -7, 'The helicopter!\nOne last fight', hoch=110)
    b.soldat(248, -7, links=247, rechts=250); b.fass(250, -7); b.schuetze(247, -7, links=246, rechts=248)
    b.deckung(252, -7, breite=2, art='sand'); b.schwer(255, -7, hp=8, links=254, rechts=256)
    b.schuetze(256, -7, links=255, rechts=257)
    b.item('health', 249, -7)


# ---------------------------------------------------------------- Schmuck
def schmuck(b):
    # Start: Zelt, Banner, Tonne. Der erste Eindruck: Hier ist Krieg, aber es ist noch ruhig.
    b.rest('zelt', 3, 0, breite=150)
    b.rest('banner', -0, 0, dx=-20)
    b.rest('tonne', 7, 0, dx=-10)
    # Erster Hof: Mauerrest im Hintergrund, Sperre und Draht vor der Kante zum ersten Gegner
    b.rest('sperre', 19, 5); b.rest('draht', 20, 5, breite=112)
    # Schluchten: Wrack einer Panzersperre-Reihe am Rand
    b.rest('sperre', 40, 5); b.rest('tonne', 41, 5)
    # Das Feld: Panzerwrack als Deckung in der Mitte, Sperren und Draht an den Seiten, Tonnen als Lichtquelle, Kistenstapel
    b.panzer(57, 59, 3, hoehe=56)
    b.gegner_xy(b.rangedEnemies, b.x(58), b.y(3) - 56, b.x(57), b.x(59), 3)                   # ein Schütze hinter dem Panzerturm
    b.rest('sperre', 52, 3); b.rest('sperre', 53, 3, dx=14); b.rest('draht', 54, 3, breite=84)
    b.rest('tonne', 61, 3); b.rest('sperre', 65, 3); b.rest('draht', 66, 3, breite=84)
    b.deckung(62, 3, breite=1, art='kiste', hoehe=2)
    # Abstieg und Tresor-Eingang: Mauerreste, Gräber
    b.rest('mauer', 75, 8, breite=168, hoehe=100); b.rest('graeber', 78, 8, anzahl=3)
    # Gipfelruhe: ein Platz zum Verschnaufen mit Spuren des Absturzes: Hubschrauberwrack, Gräber, Banner, Tonne
    b.rest('hubschrauber', 120, -2); b.rest('graeber', 115, -2, anzahl=4); b.rest('banner', 114, -2, dx=-10); b.rest('tonne', 118, -2)
    # Brücken: Banner an den Klippen, Mauer
    b.rest('banner', 131, -2, dx=24); b.rest('mauer', 138, -2, breite=112, hoehe=84)
    # Festung: Banner davor, Sperren und Draht vor den Türen, Tonnen als Fackeln
    b.rest('banner', 161, 0); b.rest('sperre', 160, 0); b.rest('draht', 175, 2, breite=84)
    b.rest('tonne', 162, 0); b.rest('tonne', 175, 2)
    b.rest('graeber', 180, 3, anzahl=3)
    # Kessel: Panzerwrack, Draht, Zelt, Tonnen
    b.panzer(214, 216, 4, hoehe=56)
    b.gegner_xy(b.rangedEnemies, b.x(215), b.y(4) - 56, b.x(214), b.x(216), 3)               # ein Schütze auf dem Wrack
    b.rest('draht', 210, 4, breite=112); b.rest('sperre', 212, 4); b.rest('zelt', 200, 3, breite=150, dx=-80)
    b.rest('tonne', 207, 4); b.rest('tonne', 218, 4)
    # Landezone: je näher am Ziel, desto mehr Zerstörung: Mauerreste, Sperren, Draht, abgestürzter Hubschrauber, Tonnen, Banner
    b.rest('mauer', 248, -7, breite=196, hoehe=120)
    b.rest('sperre', 249, -7); b.rest('sperre', 252, -7); b.rest('draht', 251, -7, breite=112)
    b.rest('hubschrauber', 251, -7, dx=30); b.rest('tonne', 247, -7); b.rest('tonne', 254, -7); b.rest('banner', 257, -7, dx=-10)
    b.rest('graeber', 244, -7, anzahl=2) if False else None
