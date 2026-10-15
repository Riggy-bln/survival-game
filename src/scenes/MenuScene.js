import { sfx } from '../Sound.js';
import level from '../levels/Auswahl.js';
import { zentriere, baueHintergrund, baueTitel, pixelKnopf, pixelText, pixelLabel, oberKnopf, MITTE_X } from '../MenuStil.js';

// Der Startbildschirm im Pixel-Retro-Stil: animierte Landschaft im Hintergrund (Sonnenuntergang, Bergketten, Lagerfeuer, Hubschrauber),
// ein wippender Titel und Knöpfe mit Farbakzent. Man wählt mit den Pfeiltasten (oder W/S) und Enter, mit der Maus oder dem Finger.
//   Hauptmenü:  Ein Spieler  |  Mehrspieler
//   Mehrspieler: Online (Freunde einladen)  |  Lokal (2 Spieler an einem Computer)  |  Zurück
//   Online:      Raum erstellen  |  Raum beitreten  |  Zurück
// "Lokal" ist noch "demnächst". Der gewählte Modus steht danach in this.registry ('modus'), damit GameScene ihn lesen kann.
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // Das Menü ist für 960 x 540 gebaut; die Kamera zoomt nach der Höhe und bleibt auch nach Größenänderungen (Vollbild) mittig.
        zentriere(this);
        this.hintergrund = baueHintergrund(this);
        this.titel = baueTitel(this, 'BROKRUN', 96, 7);

        // Band mit dem Levelnamen unter dem Titel
        const band = this.add.graphics().setDepth(9);
        band.fillStyle(0x000000, 0.45).fillRect(MITTE_X - 215, 139, 430, 30);
        band.fillStyle(0xd9501c).fillRect(MITTE_X - 215, 136, 430, 28).fillStyle(0xff9a3c).fillRect(MITTE_X - 215, 136, 430, 5);
        band.fillStyle(0xd9501c).fillTriangle(MITTE_X - 215, 136, MITTE_X - 235, 150, MITTE_X - 215, 164).fillTriangle(MITTE_X + 215, 136, MITTE_X + 235, 150, MITTE_X + 215, 164);
        pixelText(this, level.titel ?? 'LEVEL 01 - ABANDONED MILITARY ZONE', 2, 0xfff3d0, 0x5a1e08).setPosition(MITTE_X, 150).setDepth(10);

        this.untertitel = pixelLabel(this, MITTE_X, 196, 3, 0xffdd55);
        this.beschreibung = pixelLabel(this, MITTE_X, 428, 2, 0xe8dcc8);

        // Erster Fingertipp: Die Touch-Steuerung merkt sich das für das Spiel. Am Handy geht beim ersten Tippen gleich der Vollbildmodus an
        // (Browser erlauben ihn nur nach einer Berührung).
        this.input.on('pointerdown', (p) => {
            if (!p.wasTouch) return;
            this.registry.set('touch', true);
            if (!this.registry.get('vollbildVersucht') && this.scale.fullscreen.available && !this.scale.isFullscreen) {
                this.registry.set('vollbildVersucht', true);
                this.vollbildUmschalten();
            }
        });
        // Oben links und rechts, gleich weit vom Rand: Ton und Vollbild
        this.tonKnopf = oberKnopf(this, 24, 26, sfx.muted ? 'SOUND: OFF  [N]' : 'SOUND: ON  [N]', () => this.tonUmschalten(), true, 'SOUND: OFF  [N]');
        this.vollbildKnopf = oberKnopf(this, 936, 26, 'FULLSCREEN', () => this.vollbildUmschalten(), false, 'SOUND: OFF  [N]');

        this.knoepfe = [];
        this.eintraege = [];
        this.auswahl = 0;
        this.zeigeMenue('haupt');
        if (new URLSearchParams(window.location.search).get('editor') === '1') this.scene.start('EditorScene');   // Testhilfe
        else if (new URLSearchParams(window.location.search).get('start') === '1') this.starte(new URLSearchParams(window.location.search).get('viewer') === '1' ? 'viewer' : 'einzel');   // Testhilfe: Menü überspringen

        // Tastatur: hoch/runter wählt, Enter oder Leertaste bestätigt, Esc geht zurück, N schaltet den Ton
        this.tasten = this.input.keyboard.addKeys('UP,DOWN,W,S,ENTER,SPACE,ESC,N');
    }

    tonUmschalten() {
        const aus = sfx.toggle();
        this.tonKnopf.setText(aus ? 'SOUND: OFF  [N]' : 'SOUND: ON  [N]');
        if (!aus) sfx.play('pickup');
    }

    vollbildUmschalten() {
        if (!this.scale.fullscreen.available) {
            this.beschreibung.setText('Fullscreen is not available in this browser.\niPhone: tap the Share icon, then "Add to Home Screen"\nand open the game from there.', 0xffdd55);
            return;
        }
        try {
            this.scale.toggleFullscreen();
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        } catch (e) { /* egal */ }
    }

    // Baut ein Menü auf. name = 'haupt', 'mehrspieler' oder 'online'.
    zeigeMenue(name) {
        this.knoepfe.forEach(k => k.zerstoere());
        this.knoepfe = [];
        this.menue = name;
        this.auswahl = 0;

        const meldung = (text) => () => this.beschreibung.setText(text, 0xff9966);
        const GRUEN = 0x58c06a, BLAU = 0x4aa3ff, ORANGE = 0xff9a3c, GRAU = 0x8a96a0;
        let eintraege;
        if (name === 'haupt') {
            eintraege = [
                { text: 'SINGLE PLAYER', info: 'Alone through the military zone.', farbe: GRUEN, aktion: () => this.starte('einzel') },
                { text: 'MULTIPLAYER', info: 'Play together with others.', farbe: BLAU, aktion: () => this.zeigeMenue('mehrspieler') },
            ];
            // Nur auf dem eigenen Rechner (localhost): ein Kartenbetrachter zum Entwickeln, in dem man frei durch die Welt fliegt
            if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                eintraege.push({ text: 'MAP EDITOR', info: 'Sketch your own map: blocks, ladders, enemies, items (only on localhost).', farbe: 0xc080ff, aktion: () => this.scene.start('EditorScene') });
                eintraege.push({ text: 'MAP VIEWER', info: 'Fly through the whole level without playing (only on localhost).', farbe: 0x80c0ff, aktion: () => this.starte('viewer') });
            }
        } else if (name === 'mehrspieler') {
            eintraege = [
                { text: 'PLAY ONLINE', info: 'Over the internet with friends: create a room and share the code.', farbe: ORANGE, aktion: () => this.zeigeMenue('online') },
                { text: 'LOCAL (2 PLAYERS)', info: 'Two players on one keyboard.', farbe: BLAU, demnaechst: true, aktion: meldung('Local multiplayer is still planned.') },
                { text: 'BACK', info: '', farbe: GRAU, aktion: () => this.zeigeMenue('haupt') },
            ];
        } else {
            eintraege = [
                { text: 'CREATE ROOM', info: 'You are the host and get a code for your friends.', farbe: GRUEN, aktion: () => this.scene.start('LobbyScene', { rolle: 'host' }) },
                { text: 'JOIN ROOM', info: "Enter your friend's code.", farbe: BLAU, aktion: () => this.scene.start('LobbyScene', { rolle: 'gast' }) },
                { text: 'BACK', info: '', farbe: GRAU, aktion: () => this.zeigeMenue('mehrspieler') },
            ];
        }
        this.eintraege = eintraege;
        this.untertitel.setText(name === 'haupt' ? '' : (name === 'online' ? '- ONLINE -' : '- MULTIPLAYER -'));

        const dicht = name === 'haupt' && eintraege.length > 2;           // mit den Entwicklerknöpfen etwas enger, damit die Beschreibung darunter frei bleibt
        const abstand = dicht ? 56 : 64, y0 = name === 'haupt' ? (dicht ? 212 : 268) : 262 - (eintraege.length - 2) * 12;
        eintraege.forEach((e, i) => {
            const k = pixelKnopf(this, MITTE_X, y0 + i * abstand, 440, 50, e.text + (e.demnaechst ? '  (soon)' : ''), e.farbe, () => { this.waehle(i); this.bestaetige(); },
                { px: 3, deaktiviert: !!e.demnaechst });
            k.beiHover = () => this.waehle(i);
            this.knoepfe.push(k);
        });
        this.waehle(0);
    }

    // Hebt einen Eintrag hervor und zeigt seine Beschreibung.
    waehle(i) {
        if (this.auswahl !== i) sfx.play('hit');
        this.auswahl = i;
        this.beschreibung.setText(this.eintraege[i].info, 0xe8dcc8);
    }

    bestaetige() {
        const e = this.eintraege[this.auswahl];
        sfx.play(e.demnaechst ? 'hurt' : 'pickup');
        e.aktion();
    }

    // Startet das Spiel im gewählten Modus ('einzel', 'viewer'; online über die Lobby).
    starte(modus) {
        this.registry.set('modus', modus);
        this.scene.start('GameScene');
    }

    update(zeit, delta) {
        this.hintergrund.update(zeit);
        this.titel.update(zeit);
        this.knoepfe.forEach((k, i) => { k.an += ((i === this.auswahl ? 1 : 0) - k.an) * 0.25; k.zeichne(zeit); });
        const t = this.tasten, n = this.eintraege.length, J = Phaser.Input.Keyboard.JustDown;
        if (J(t.DOWN) || J(t.S)) this.waehle((this.auswahl + 1) % n);
        if (J(t.UP) || J(t.W)) this.waehle((this.auswahl + n - 1) % n);
        if (J(t.ENTER) || J(t.SPACE)) this.bestaetige();
        if (J(t.N)) this.tonUmschalten();
        if (J(t.ESC) && this.menue !== 'haupt') this.zeigeMenue(this.menue === 'online' ? 'mehrspieler' : 'haupt');
    }
}
