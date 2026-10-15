# Verziert das ganze neue Level mit Kriegsüberresten, Kisten, Autos, Grubenstützen, Schienen und mehr, damit keine Strecke leer wirkt.
# Orientiert sich an dem, was der erste (alte) Teil des Levels verwendet: Kistenstapel, Stützen und Lampen in den Höhlen, Schienen mit Grubenwagen,
# ausgebrannte Autos, Zäune, Sandsäcke, Tonnen. Alles ist reine Dekoration (kein Einfluss auf Gegner und Spieler).
#
# Regeln:
#  * Es wird nur auf Flächen verziert, auf denen nichts steht: Abstand zu Gegnern, Gegenständen, Fässern, Fahnen, Schildern, Leitern, Brücken
#    und schon gesetzten Dekorationen (sonst verdecken sich Dinge oder wirken überladen).
#  * Höhlenböden (dort, wo ein Höhlenhintergrund hinter der Fläche liegt) bekommen Grubenstützen, Lampen, Kisten, Schienen und Wagen.
#  * Offene Flächen bekommen je nach Länge Autos, Kistenstapel, Sandsäcke, Wellblech-Unterstände, Reifen, Strommasten und Tonnen.
#  * In der Boss-Arena (Spalte 246 bis 271) wird nichts gestellt: freie Sicht für den Kampf.
import random

def verziere(b, bloecke, daten, arena=(246, 272), seed=2026):
    rnd = random.Random(seed)
    zonen = [d for d in daten['dinge'] if d['t'] == 'hintergrund' and d.get('art') != 'gebaeude']
    def in_zone(c, r): return any(z['cx0'] <= c <= z['cx1'] and z['cy0'] <= r <= z['cy1'] for z in zonen)
    belegt = []                                     # Pixel-x-Bereiche (x0, x1), in denen schon etwas steht
    def spalte(c): return b.x(c)
    for liste in (b.enemies, b.rangedEnemies, b.skelette, b.pickups, b.faesser, b.signs, b.flaggen, b.leitern):
        for e in liste: belegt.append((e['x'] - 8, e['x'] + 8))
    for r in b.reste: belegt.append((r['x'] - 30, r['x'] + 30))
    for p in b.platforms:
        if p.get('bruecke') or p.get('brechbar') or p.get('kollision'): belegt.append((p['x'] - p['w'] / 2 - 20, p['x'] + p['w'] / 2 + 20))
    if b.boss_daten: belegt.append((b.boss_daten['left'] - 80, b.boss_daten['right'] + 80))
    for d in daten['dinge']:
        if d['t'] == 'fahne': belegt.append((b.x(d['cx']) - 90, b.x(d['cx']) + 90))
        if d['t'] == 'start': belegt.append((b.x(d['cx']) - 90, b.x(d['cx']) + 90))
    def frei(x, w):
        w = w * 0.6                                  # die Dekoration darf an den Rändern leicht überlappen
        return not any(x + w > a and x - w < e for a, e in belegt)
    def setze(art, cx, r, w=40, **extra):
        x = b.x(cx) + extra.get('dx', 0)
        if not frei(x, w): return False
        b.rest(art, cx, r, **extra); belegt.append((x - w, x + w)); return True
    def versuche(art, zellen, r, w, **extra):
        """Probiert die Zellen in zufälliger Reihenfolge, bis eine frei ist."""
        for c in rnd.sample(zellen, len(zellen)):
            if setze(art, c, r, w, **extra): return True
        return False

    # Die Flächen (Läufe zusammenhängender Zellen mit freier Luft darüber), links nach rechts
    zaehler = {}
    for a, e, r in b.flaechen:
        if arena[0] <= a <= arena[1] or a < -1: continue
        e = min(e, arena[0] - 1)                    # die Arena bleibt frei
        laenge = e - a + 1
        if any(bloecke.get((c, r)) in ('h', 'f') for c in range(a, e + 1)): continue            # Brücken und Böden nicht verzieren
        hoehle = in_zone((a + e) // 2, r - 1)
        # sicher begehbare Zellen (nicht ganz am Rand)
        zellen = list(range(a + 1, e)) if laenge >= 4 else [ (a + e) // 2 ]
        if hoehle:
            # Grubenstützen alle 5 bis 7 Zellen, wenn Boden und Decke 2 bis 7 Zellen auseinanderliegen
            c = a + rnd.randint(1, 3)
            while c < e - 1:
                h = 0
                while (c, r - 1 - h) not in bloecke and h < 9: h += 1
                if 2 <= h <= 7:
                    for dc in (0, 1, -1, 2, -2):                         # steht dort schon etwas, eine Zelle daneben probieren
                        c2 = c + dc
                        hh = 0
                        while (c2, r - 1 - hh) not in bloecke and hh < 9: hh += 1
                        if a < c2 < e and 2 <= hh <= 7 and setze('stuetze', c2, r, 6, dx=rnd.choice([-12, 0, 12])):
                            zaehler['stuetze'] = zaehler.get('stuetze', 0) + 1
                            break
                c += rnd.randint(5, 7)
            # Lampen an der Decke: alle 8 Zellen
            for c in range(a + 2, e - 1, 8):
                h = 0
                while (c, r - 1 - h) not in bloecke and h < 9: h += 1
                if 2 <= h <= 7 and (c, r - 1 - h) in bloecke:
                    ydecke = b.y(r - h)
                    b.decor.append({'x': b.x(c), 'y': ydecke + 8, 'w': 10, 'h': 8, 'color': 0xc9a94e}); b.lampen.append({'x': b.x(c), 'y': ydecke + 20})
            if laenge >= 9 and rnd.random() < 0.8 and versuche('schienen', zellen, r, 120, breite=min(280, laenge * 28), wagen=rnd.random() < 0.6, wagenX=rnd.randint(-30, 60)): zaehler['schienen'] = zaehler.get('schienen', 0) + 1
            for _ in range(max(1, laenge // 6)):
                if versuche('kisten', zellen, r, 44, anzahl=rnd.randint(2, 4)): zaehler['kisten'] = zaehler.get('kisten', 0) + 1
            if laenge >= 6 and rnd.random() < 0.5 and versuche('tonne', zellen, r, 26): zaehler['tonne'] = zaehler.get('tonne', 0) + 1
            continue
        # offene Flächen
        gewichte = {'kisten': 3, 'reifen': 1}
        if laenge >= 6: gewichte.update({'sandsaecke': 3})
        if laenge >= 7: gewichte.update({'auto': 3})
        if laenge >= 9: gewichte.update({'wellblech': 2, 'strommast': 2})
        wuensche = rnd.choices(list(gewichte), weights=list(gewichte.values()), k=max(2, laenge // 3))
        for art in wuensche:
            if art == 'auto': ok = versuche('auto', zellen, r, 80)
            elif art == 'kisten': ok = versuche('kisten', zellen, r, 44, anzahl=rnd.randint(2, 4))
            elif art == 'sandsaecke': ok = versuche('sandsaecke', zellen, r, 56, breite=rnd.choice([84, 112]), reihen=rnd.randint(2, 3))
            elif art == 'wellblech': ok = versuche('wellblech', zellen, r, 80, breite=rnd.choice([112, 140]))
            elif art == 'strommast': ok = versuche('strommast', zellen, r, 26, hoehe=rnd.randint(170, 230))
            else: ok = versuche('reifen', zellen, r, 36, anzahl=rnd.randint(2, 3))
            if ok: zaehler[art] = zaehler.get(art, 0) + 1
    return zaehler
