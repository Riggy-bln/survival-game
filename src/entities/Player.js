import { sfx } from '../Sound.js';
import { stufenHilfe } from '../Stufen.js';
import { WAFFEN, START, NACHSCHUB } from '../WaffenKonfig.js';

const KLETTERN = 170;   // Klettertempo auf der Leiter (Pixel pro Sekunde)
const WAND_RUTSCH = 90; // so schnell rutscht man an einer Wand hinunter (Pixel pro Sekunde)

// Die Waffentabelle (Schaden, Munition, Feuerrate ...) steht in WaffenKonfig.js.
// Plätze der Inventarleiste (Tasten 1 bis 5, Mausrad): Wurfmesser, EINE Schusswaffe, Nahkampf (Faust/Schwert), Granate, Verbandskasten.
// Man trägt immer höchstens eine Schusswaffe (this.fernwaffe). Eine neue tauscht man gegen die alte (Waffentausch in GameScene): Die alte bleibt am Boden liegen.
export const SLOTS = ['knife', 'ranged', 'melee', 'grenade', 'medkit'];

// Der Spieler: ein grünes Rechteck, das sich selbst steuern kann.
export default class Player extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 32, 48, 0x66cc66);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(true);  // nicht aus der Welt laufen können

        // Werte, die wir zum Feintuning des Spielgefühls später leicht ändern können
        this.speed = 250;      // Lauftempo in Pixeln pro Sekunde
        this.jumpSpeed = 520;  // Startgeschwindigkeit nach oben beim Sprung

        // Lebenspunkte: Zwei Zahlen reichen. "health" ändert sich, "maxHealth" bleibt fest.
        this.maxHealth = 100;
        this.health = this.maxHealth;

        // Inventar: Verbandskästen zum Mitführen. Sie heilen erst, wenn man H drückt.
        this.medkits = 1;          // Start: einer, damit man die Taste kennenlernt
        this.maxMedkits = 2;       // mehr passen nicht in den Rucksack
        this.medkitHeal = 40;      // Lebenspunkte pro Verbandskasten
        this.grenades = 2;         // Granaten im Rucksack (Taste G wirft eine)
        this.maxGrenades = 4;

        // Munition: jede Waffe hat ihr eigenes Magazin und ihre eigene Reserve (muni[waffe].mag / .res). Getragen wird aber immer nur EINE
        // Schusswaffe (fernwaffe). Legt man eine ab, nimmt ihr Zustand (Magazin und Reserve) den Weg auf den Boden mit (siehe laesstWaffeFallen).
        //   mag = Kugeln im Magazin (sofort verschießbar), res = Reserve im Rucksack (kommt beim Nachladen ins Magazin).
        //   Beim Flammenwerfer ist mag der Treibstoff (Prozent) und res bleibt 0. magAmmo, ammo und magSize gelten für die Waffe in der Hand.
        this.muni = {};
        for (const name of Object.keys(WAFFEN)) this.muni[name] = { mag: 0, res: 0 };
        this.fernwaffe = null;        // die getragene Schusswaffe ('pistol', 'rifle', 'shotgun', 'rocket', 'flame') oder null
        this.eingefroren = false;     // true, solange die Waffentausch-Anzeige offen ist: keine Bewegung, kein Schießen
        this.messer = START.messer;   // Wurfmesser im Rucksack
        this.reloadingUntil = 0;      // 0 = lädt gerade nicht nach
        this.weapon = 'pistol';       // Werte der zuletzt getragenen Waffe (Platzhalter, solange man keine hat; siehe equip)
        this.equip('pistol');
        // Zum Testen: ?waffe=rocket (oder pistol, rifle, shotgun, flame) beginnt das Spiel mit dieser Schusswaffe
        try { const t = new URLSearchParams(window.location.search).get('waffe'); if (t && WAFFEN[t]) this.nimmWaffe(t, null, false); } catch (e) { /* kein Browser */ }

        // Inventarleiste (siehe SLOTS oben). "auswahl" ist der gewählte Platz (1 bis 9); mit der linken Maustaste benutzt man den gewählten Gegenstand.
        // Am Anfang hat man nur Wurfmesser und Fäuste.
        this.auswahl = 1;
        this.hatSchwert = false;   // das Schwert muss man erst finden
        this.seil = null;          // fährt gerade auf der Seilbahn? (sonst null)

        // Eingaben vom Touchscreen (Touch.js schreibt hier hinein): links/rechts/sprung gelten, solange gehalten;
        // nachladen/heilen/granate sind einmalige Tipps, die update() abholt.
        this.touchEin = { links: false, rechts: false, sprung: false, hoch: false, runter: false, nachladen: false, heilen: false, granate: false };

        // Leiter: Auf einer Leiter (W/S oder Pfeil hoch/runter) klettert man ohne Schwerkraft. Seitlich weg oder Leertaste lässt los.
        this.leiter = null;
        this.leiterPause = 0;      // bis dahin greift man nicht gleich wieder zu

        // Wandsprung wie bei Broforce: In der Luft gegen eine hohe senkrechte Wand laufen = festhalten und langsam hinabrutschen.
        // Sprung an der Wand: Zur Wand gehalten springt man an ihr hoch (so kann man hohe Wände hinaufspringen),
        // vom Wand weg gehalten stößt man sich seitlich ab.
        this.wand = 0;             // -1 = hängt an einer Wand links, 1 = rechts, 0 = nicht
        this.wandPause = 0;        // kurze Pause zwischen zwei Wandsprüngen
        this.wandKickBis = 0;      // so lange gilt die Eingabe zur Seite nicht (der Absprung)

        // Zeitpunkte (in Millisekunden seit Spielstart), bis zu denen etwas gilt.
        // 0 heißt: gilt gerade nicht, denn die Zeit ist schon vorbei.
        this.tot = false;            // Mehrspieler: am Boden, wartet auf Wiederbelebung
        this.invulnerableUntil = 0;  // bis dahin kann der Spieler keinen Schaden nehmen
        this.stunnedUntil = 0;       // bis dahin kann er nicht laufen (Rückstoß)

        // Tasten, die der Spieler abfragt
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('A,D,SPACE,R,H,G,E,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,W,S');
    }

    // Benutzt einen Verbandskasten, aber nur wenn es sinnvoll ist:
    // einer vorhanden, Leben nicht voll. Gibt true zurück, wenn er benutzt wurde.
    useMedkit() {
        if (this.medkits <= 0 || this.health >= this.maxHealth || this.isDead()) return false;
        this.medkits -= 1;
        sfx.play('heal');
        this.health = Math.min(this.maxHealth, this.health + this.medkitHeal);  // nie über das Maximum
        return true;
    }

    // Munition der Waffe in der Hand (für Anzeige und Schießen): magAmmo = Magazin (beim Flammenwerfer: Treibstoff), ammo = Reserve.
    get magAmmo() { return this.muni?.[this.weapon]?.mag ?? 0; }
    set magAmmo(v) { if (this.muni?.[this.weapon]) this.muni[this.weapon].mag = v; }
    get ammo() { return this.muni?.[this.weapon]?.res ?? 0; }
    set ammo(v) { if (this.muni?.[this.weapon]) this.muni[this.weapon].res = v; }
    get maxAmmo() { return WAFFEN[this.weapon]?.maxReserve ?? 0; }
    // Welche Schusswaffe trägt man? (Abfrage wie früher: besitzt.pistol usw. Es ist immer höchstens eine wahr.)
    get besitzt() { const o = {}; for (const n of Object.keys(WAFFEN)) o[n] = this.fernwaffe === n; return o; }

    // Welche Art hat ein Platz der Leiste? ('knife', 'ranged', 'melee', 'grenade', 'medkit')
    slotArt(platz = this.auswahl) { return SLOTS[platz - 1]; }
    // Was ist gerade ausgewählt, mit dem Namen der Schusswaffe statt "ranged"? ('knife', 'pistol', ..., 'melee', 'grenade', 'medkit')
    aktArt() { const a = this.slotArt(); return a === 'ranged' ? this.fernwaffe : a; }
    // Welche Waffe aus der Tabelle hält der Spieler gerade? (null bei Messer, Nahkampf, Granate, Verbandskasten)
    imHandWaffe() { return this.slotArt() === 'ranged' ? this.fernwaffe : null; }

    // Kann man diesen Platz wählen? Die Schusswaffe nur, wenn man eine trägt; Wurfmesser nur, solange welche da sind.
    verfuegbar(platz) {
        const art = SLOTS[platz - 1];
        if (art === 'ranged') return this.fernwaffe !== null;
        if (art === 'knife') return this.messer > 0;
        return true;
    }

    // Wählt einen Platz der Inventarleiste (1 bis 5). Gibt false zurück, wenn er (noch) nicht verfügbar ist.
    waehle(platz) {
        if (platz < 1 || platz > SLOTS.length || !this.verfuegbar(platz)) return false;
        if (platz !== this.auswahl) sfx.schleifeStopp('flame.schleife');          // Waffe gewechselt: der Flammenwerfer-Ton endet sofort
        this.auswahl = platz;
        if (SLOTS[platz - 1] === 'ranged') this.equip(this.fernwaffe);
        return true;
    }

    // Mausrad: zum nächsten bzw. vorigen verfügbaren Platz (gesperrte Plätze werden übersprungen).
    naechster(richtung) {
        let platz = this.auswahl;
        for (let i = 0; i < SLOTS.length; i++) {
            platz = ((platz - 1 + richtung + SLOTS.length) % SLOTS.length) + 1;
            if (this.verfuegbar(platz)) { this.waehle(platz); return; }
        }
    }

    // Was hält die Figur gerade in der Hand? (Für die Zeichnung und für die Mitspieler.)
    inHand() {
        const art = this.slotArt();
        return art === 'ranged' ? (this.fernwaffe ?? 'fist') : art === 'melee' ? (this.hatSchwert ? 'sword' : 'fist') : art;
    }

    // Eine Schusswaffe in die Hand nehmen. zustand = { mag, res } einer abgelegten Waffe (sonst Startwerte aus der Tabelle).
    // Die Regel "nur EINE Schusswaffe" gilt hier: Trägt man schon eine andere, wird nichts genommen (erst laesstWaffeFallen aufrufen).
    nimmWaffe(name, zustand = null, auswaehlen = true) {
        const w = WAFFEN[name];
        if (!w || (this.fernwaffe && this.fernwaffe !== name)) return false;
        this.fernwaffe = name;
        const m = this.muni[name];
        if (zustand) { m.mag = zustand.mag; m.res = zustand.res; }
        else if (w.typ === 'flamme') { m.mag = w.startTreibstoff; m.res = 0; }
        else { m.mag = w.magSize; m.res = w.startReserve; }
        this.equip(name);
        if (auswaehlen) this.waehle(SLOTS.indexOf('ranged') + 1);
        return true;
    }

    // Die getragene Schusswaffe ablegen: Gibt ihren Zustand zurück ({ waffe, mag, res }) und leert die Hände (keine Munition bleibt zurück).
    // Ist die Schusswaffe gerade ausgewählt, wechselt die Auswahl zum Nahkampf.
    laesstWaffeFallen() {
        const name = this.fernwaffe;
        if (!name) return null;
        const m = this.muni[name], zustand = { waffe: name, mag: m.mag, res: m.res };
        m.mag = 0; m.res = 0;
        this.fernwaffe = null;
        if (this.reloadingUntil) sfx.stoppe('ak47.nachladen');
        this.reloadingUntil = 0;
        sfx.schleifeStopp('flame.schleife');
        if (this.slotArt() === 'ranged') this.auswahl = SLOTS.indexOf('melee') + 1;
        return zustand;
    }

    // Eine zweite Waffe derselben Sorte: ihre Munition dazu (gibt 'nachschub' oder 'voll' zurück)
    nimmNachschub(name, zustand) {
        const w = WAFFEN[name], m = this.muni[name];
        if (this.fernwaffe !== name) return 'voll';
        const plus = w.typ === 'flamme' ? (zustand ? zustand.mag : NACHSCHUB.treibstoff) : (zustand ? zustand.mag + zustand.res : (name === 'rocket' ? NACHSCHUB.raketen : w.magSize));
        if (w.typ === 'flamme') { if (m.mag >= w.maxTreibstoff) return 'voll'; m.mag = Math.min(w.maxTreibstoff, m.mag + plus); }
        else { if (m.res >= w.maxReserve) return 'voll'; m.res = Math.min(w.maxReserve, m.res + plus); }
        return 'nachschub';
    }

    // Munition aus einer Munitionskiste: nur für die getragene Kugelwaffe (Pistole, Maschinengewehr, Schrotflinte).
    gibMunition(menge) {
        const n = this.fernwaffe;
        if (!n || WAFFEN[n].typ !== 'kugel') return 'keine';
        const m = this.muni[n], max = WAFFEN[n].maxReserve;
        if (m.res >= max) return 'voll';
        m.res = Math.min(max, m.res + menge);
        return n;
    }

    // An die Leiter greifen: Die Figur hängt in der Mitte der Leiter, ohne Schwerkraft.
    packeLeiter(l) {
        this.leiter = l;
        this.body.setAllowGravity(false);
        const fuss = this.body.bottom;
        const x = l.x, y = fuss < l.oben + 12 ? l.oben + 12 - 24 : this.y;      // von oben einsteigen: ein Stück unter die Kante
        this.body.reset(x, y);
    }

    // Von der Leiter lösen (mit etwas Schwung).
    loslassen(vx = 0, vy = 0) {
        if (!this.leiter) return;
        this.leiter = null;
        this.leiterPause = this.scene.time.now + 250;
        this.body.setAllowGravity(true);
        this.body.setVelocity(vx, vy);
    }

    // Jedes Bild auf der Leiter: hoch/runter klettern, oben auf die Plattform steigen, seitlich oder mit Leertaste abspringen.
    klettere(hoch, runter) {
        const l = this.leiter, body = this.body;
        const links = this.cursors.left.isDown || this.keys.A.isDown || this.touchEin.links;
        const rechts = this.cursors.right.isDown || this.keys.D.isDown || this.touchEin.rechts;
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) { this.loslassen((rechts ? 1 : links ? -1 : 0) * 220, -300); return; }
        if ((links || rechts) && !hoch && !runter) { this.loslassen((rechts ? 1 : -1) * 200, -120); return; }
        const v = hoch ? -KLETTERN : runter ? KLETTERN : 0;
        body.setVelocity(0, v);
        this.x += (l.x - this.x) * 0.4;                                  // sanft in die Mitte der Leiter
        if (v < 0 && body.bottom <= l.oben + 4) {                        // oben angekommen: auf die Plattform steigen
            this.leiter = null;
            this.leiterPause = this.scene.time.now + 300;
            body.setAllowGravity(true);
            body.reset(l.x + l.seite * (l.ausX ?? 22), l.oben - 24);
        } else if (v > 0 && body.bottom >= l.unten) {                    // unten angekommen
            this.loslassen(0, 0);
        }
    }

    // Nimmt eine Waffe aus der Tabelle in die Hand: Feuerrate, Magazingröße usw. werden übernommen. Ein laufendes Nachladen wird abgebrochen.
    equip(waffe) {
        const w = WAFFEN[waffe];
        if (!w) return;
        this.weapon = waffe;
        this.weaponName = w.name;
        this.fireDelay = w.fireDelay;
        this.magSize = w.magSize ?? 0;
        this.reloadTime = w.reloadTime ?? 0;
        this.pellets = w.pellets ?? 1;   // normale Waffen schießen eine Kugel
        this.spread = w.spread ?? 0;
        this.range = w.range ?? 0;       // 0 = unbegrenzt
        if (this.reloadingUntil) sfx.stoppe('ak47.nachladen');   // laufendes Nachladen abbrechen: auch der Ton
        this.reloadingUntil = 0;
    }

    // Nach dem Wiederbeleben am Checkpoint: Magazin voll und eine kleine Reserve für die getragene Waffe (mindestens 3 Wurfmesser).
    fuelleAuf() {
        const name = this.fernwaffe;
        if (name) {
            const w = WAFFEN[name], m = this.muni[name];
            if (w.typ === 'flamme') m.mag = Math.max(m.mag, w.maxTreibstoff / 2);
            else { m.mag = w.magSize; m.res = Math.max(m.res, Math.min(w.maxReserve, w.typ === 'rakete' ? 2 : 30)); }
        }
        this.messer = Math.max(this.messer, 3);
        this.reloadingUntil = 0;
    }

    // Lädt gerade nach?
    isReloading() {
        return this.reloadingUntil > 0;
    }

    // Darf der Spieler jetzt schießen? Nur mit Kugel im Magazin und nicht beim Nachladen.
    canShoot() {
        return this.magAmmo > 0 && !this.isReloading();
    }

    // Lädt die Waffe in der Hand mit Magazin (also keine Flammen)? Nur dann gibt es Nachladen.
    hatMagazin() {
        const n = this.imHandWaffe();
        return !!n && WAFFEN[n].typ !== 'flamme';
    }

    // Beginnt das Nachladen, aber nur wenn es sinnvoll ist:
    // nicht doppelt, nicht bei vollem Magazin, nicht ohne Reserve.
    startReload() {
        if (!this.hatMagazin() || this.isReloading() || this.magAmmo >= this.magSize || this.ammo <= 0) return;
        this.reloadingUntil = this.scene.time.now + this.reloadTime;
        if (!sfx.muted) sfx.nachladen(this.weapon, this.reloadTime);
    }

    // Wenn die Nachladezeit vorbei ist, wandern Kugeln aus der Reserve ins Magazin.
    updateReload() {
        if (!this.hatMagazin() || !this.isReloading() || this.scene.time.now < this.reloadingUntil) return;
        const benoetigt = this.magSize - this.magAmmo;   // so viele fehlen im Magazin
        const kugeln = Math.min(benoetigt, this.ammo);   // mehr als die Reserve gibt es nicht
        this.magAmmo += kugeln;
        this.ammo -= kugeln;
        this.reloadingUntil = 0;
    }

    // Ist der Spieler besiegt?
    isDead() {
        return this.health <= 0;
    }

    // Versucht, Schaden zuzufügen. fromX = x-Position des Angreifers (für den Rückstoß).
    // Gibt true zurück, wenn der Schaden wirklich angekommen ist.
    takeDamage(amount, fromX) {
        const now = this.scene.time.now;

        // Solange die Unverwundbarkeit läuft, passiert nichts. Genau das verhindert,
        // dass dieselbe Berührung in jedem der 60 Frames pro Sekunde erneut Schaden macht.
        if (now < this.invulnerableUntil) return false;

        this.health = Math.max(0, this.health - amount);  // nie unter 0
        this.invulnerableUntil = now + 1000;  // 1 Sekunde Schutz
        sfx.play('hurt');
        this.stunnedUntil = now + 250;        // kurz die Kontrolle verlieren

        // Rückstoß: weg vom Angreifer und ein kleiner Sprung nach oben.
        const richtung = this.x < fromX ? -1 : 1;
        this.body.setVelocity(richtung * 300, -250);
        return true;
    }

    // Wird von der Szene in jedem Frame aufgerufen.
    update() {
        const body = this.body;
        const now = this.scene.time.now;

        // Während der Unverwundbarkeit blinken: alle 100 ms zwischen durchsichtig
        // und normal wechseln. So sieht man, dass man gerade geschützt ist.
        const geschuetzt = now < this.invulnerableUntil;
        this.setAlpha(geschuetzt && Math.floor(now / 100) % 2 === 0 ? 0.3 : 1);

        // Beim Waffentausch (Anzeige offen) bleibt die Figur stehen und tut sonst nichts.
        if (this.eingefroren) { body.setVelocityX(0); return; }
        // Zahlentasten 1 bis 5 wählen den Platz in der Inventarleiste (die Schusswaffe nur, wenn man eine trägt).
        ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((name, i) => {
            if (Phaser.Input.Keyboard.JustDown(this.keys[name]) && !this.waehle(i + 1)) this.scene.zeigeGesperrt(i + 1);
        });
        // Nachladen: Taste R startet es. JustDown ist nur im Moment des Drückens wahr.
        if (Phaser.Input.Keyboard.JustDown(this.keys.R) || this.touchEin.nachladen) this.startReload();
        this.touchEin.nachladen = false;
        // Heilen: Taste H (nur im Moment des Drückens).
        if (Phaser.Input.Keyboard.JustDown(this.keys.H) || this.touchEin.heilen) {
            if (!this.useMedkit() && this.touchEin.heilen) this.scene.showMessage(this.medkits <= 0 ? 'No medkits left!' : 'Your health is already full.');
        }
        this.touchEin.heilen = false;
        // Granate werfen: Die Szene kennt Maus und Welt, deshalb ruft der Spieler sie nur an.
        if ((Phaser.Input.Keyboard.JustDown(this.keys.G) || this.touchEin.granate) && this.grenades > 0) {
            this.scene.throwGrenade();
        }
        this.touchEin.granate = false;
        // Ist das Magazin leer, aber noch Reserve da? Dann automatisch nachladen.
        if (this.hatMagazin() && this.magAmmo === 0) this.startReload();
        this.updateReload();

        if (this.seil) return;   // auf der Seilbahn steuert die Szene die Bewegung

        // Beim Rückstoß nicht laufen, sonst würde die Steuerung ihn sofort überschreiben.
        if (now < this.stunnedUntil) return;

        // Leitern: nach oben oder unten drücken, wenn man an einer Leiter steht, greift zu. (Das geht vor dem Springen.)
        const hoch = this.cursors.up.isDown || this.keys.W.isDown || this.touchEin.hoch;
        const runter = this.cursors.down.isDown || this.keys.S.isDown || this.touchEin.runter;
        if (this.leiter) { this.klettere(hoch, runter); return; }
        if ((hoch || runter) && now > this.leiterPause) {
            const l = this.scene.leiterFuer(this, runter && !hoch ? 1 : -1);
            if (l) { this.packeLeiter(l); return; }
        }

        // Laufen (nach einem Wandsprung gilt die Seiteneingabe kurz nicht: Der Absprung soll tragen)
        const nachLinks = this.cursors.left.isDown || this.keys.A.isDown || this.touchEin.links;
        const nachRechts = this.cursors.right.isDown || this.keys.D.isDown || this.touchEin.rechts;
        if (now < this.wandKickBis) {
            // Absprung läuft
        } else if (nachLinks) {
            body.setVelocityX(-this.speed);   // negativ = nach links
        } else if (nachRechts) {
            body.setVelocityX(this.speed);    // positiv = nach rechts
        } else {
            body.setVelocityX(0);
        }

        // Sanfte Hänge hinauflaufen (kleine Stufen werden automatisch genommen)
        stufenHilfe(this, nachLinks ? -1 : nachRechts ? 1 : 0);

        // Wand: in der Luft gegen eine hohe Wand gedrückt?
        let kontakt = 0;                                          // berührt er in der Luft eine hohe Wand? (auch ohne zu drücken)
        if (!body.blocked.down && body.velocity.y > -80 && now >= this.wandKickBis) {
            if (body.blocked.left && this.scene.hoheWand(this, -1)) kontakt = -1;
            else if (body.blocked.right && this.scene.hoheWand(this, 1)) kontakt = 1;
        }
        if (kontakt) { this.kontaktSeite = kontakt; this.kontaktZeit = now; }
        const wand = kontakt && ((kontakt === -1 && nachLinks) || (kontakt === 1 && nachRechts)) ? kontakt : 0;   // festhalten nur zur Wand gedrückt
        this.wand = wand;
        if (wand) {
            if (body.velocity.y > WAND_RUTSCH) body.setVelocityY(WAND_RUTSCH);      // langsam hinabrutschen
            if (now > (this.naechsterWandStaub ?? 0)) {
                this.naechsterWandStaub = now + 140;
                if (this.scene.fx) this.scene.fx.staubE.explode(1, this.x + wand * 14, this.y + Phaser.Math.Between(-10, 20));
            }
        }

        // Springen: auf festem Grund oder an der Wand. In Phaser zeigt "oben" ins Negative!
        const jumpPressed = this.cursors.up.isDown || this.keys.SPACE.isDown || this.touchEin.sprung;
        const sprungNeu = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            !!(this.scene.touch && this.scene.touch.aktiv && this.scene.touch.sprungTipp);
        if (jumpPressed && body.blocked.down) {
            body.setVelocityY(-this.jumpSpeed);
        } else if (sprungNeu && now > this.wandPause && now - (this.kontaktZeit ?? -999) < 140) {
            const seite = this.kontaktSeite;                                          // an welcher Wand war er gerade?
            this.wandPause = now + 200;
            const weg = (seite === -1 && nachRechts) || (seite === 1 && nachLinks);   // von der Wand weg gehalten: abstoßen
            if (weg) { body.setVelocity(-seite * 230, -470); this.wandKickBis = now + 170; }
            else { body.setVelocity(0, -440); }                                       // zur Wand gehalten (oder nichts): an der Wand hochspringen
            sfx.play('hit');
            if (this.scene.fx) this.scene.fx.staubE.explode(4, this.x + seite * 14, this.y);
        }
    }
}
