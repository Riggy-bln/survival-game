import { sfx } from '../Sound.js';

// Der Startbildschirm mit Menü. Man wählt mit den Pfeiltasten (oder W/S) und Enter, oder mit der Maus.
//   Hauptmenü:  Ein Spieler  |  Mehrspieler
//   Mehrspieler: Online (Freunde einladen)  |  Lokal (2 Spieler an einem Computer)  |  Zurück
//   Online:      Raum erstellen  |  Raum beitreten  |  Zurück
// "Lokal" ist noch "demnächst": Das Menü steht, die Funktionen kommen Schritt für Schritt (siehe PLAN-Mehrspieler.md).
// Der gewählte Modus steht danach in this.registry ('modus'), damit GameScene ihn lesen kann.
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // Das Menü ist für 960 x 540 gebaut: Die Kamera vergrößert es passend auf das größere Fenster.
        this.cameras.main.setZoom(this.scale.width / 960).centerOn(480, 270);

        this.add.text(480, 80, 'SURVIVAL GAME', { fontSize: '64px', color: '#e0e6ea', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(480, 138, 'Level 01: Verlassene Militärzone', { fontSize: '22px', color: '#9fb0bd' }).setOrigin(0.5);

        this.untertitel = this.add.text(480, 190, '', { fontSize: '24px', color: '#ffdd55', fontStyle: 'bold' }).setOrigin(0.5);
        this.beschreibung = this.add.text(480, 428, '', { fontSize: '18px', color: '#cfd8dc', align: 'center' }).setOrigin(0.5);
        this.add.text(480, 490,
            'A/D oder Pfeile: Laufen   Leertaste: Springen   Maus: Zielen und Schießen   R: Nachladen   H: Heilen   G: Granate   Esc: Pause',
            { fontSize: '13px', color: '#7f8f9a', align: 'center' }).setOrigin(0.5);
        this.add.text(480, 510, 'Handy: Linker Daumen = Laufen (nach oben schieben = Springen), rechter Daumen = Zielen und Schießen (Tippen = Schnellschuss)',
            { fontSize: '12px', color: '#6f7f8a', align: 'center' }).setOrigin(0.5);
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
        // Knopf oben rechts: Vollbild
        this.vollbildKnopf = this.add.text(932, 22, '[ ] Vollbild', { fontSize: '16px', color: '#9fb0bd', backgroundColor: '#1b2630', padding: { x: 8, y: 4 } })
            .setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        this.vollbildKnopf.on('pointerdown', () => this.vollbildUmschalten());

        this.menuObjekte = [];       // alle Texte und Rahmen des aktuellen Menüs (werden beim Wechsel gelöscht)
        this.auswahl = 0;
        this.zeigeMenue('haupt');

        // Tastatur: hoch/runter wählt, Enter oder Leertaste bestätigt, Esc geht zurück
        const tasten = this.input.keyboard.addKeys('UP,DOWN,W,S,ENTER,SPACE,ESC');
        this.tasten = tasten;
    }

    vollbildUmschalten() {
        if (!this.scale.fullscreen.available) {
            this.beschreibung.setText('Vollbild geht in diesem Browser nicht.\niPhone: Teilen-Symbol, dann "Zum Home-Bildschirm" und von dort öffnen.').setColor('#ffdd55');
            return;
        }
        try {
            this.scale.toggleFullscreen();
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        } catch (e) { /* egal */ }
    }

    // Baut ein Menü auf. name = 'haupt' oder 'mehrspieler'.
    zeigeMenue(name) {
        this.menuObjekte.forEach(o => o.destroy());
        this.menuObjekte = [];
        this.menue = name;
        this.auswahl = 0;

        const meldung = (text) => () => this.beschreibung.setText(text).setColor('#ff9966');
        const eintraege = name === 'haupt'
            ? [
                { text: 'Ein Spieler', info: 'Allein durch die Militärzone.', aktion: () => this.starte('einzel') },
                { text: 'Mehrspieler', info: 'Gemeinsam mit anderen spielen.', aktion: () => this.zeigeMenue('mehrspieler') },
            ]
            : [
                { text: 'Online (Freunde einladen)', info: 'Über das Internet mit Freunden: Raum erstellen, Code weitergeben.',
                  aktion: () => this.zeigeMenue('online') },
                { text: 'Lokal (2 Spieler an einem Computer)', info: 'Zu zweit an einer Tastatur.',
                  demnaechst: true, aktion: meldung('Lokaler Mehrspieler ist noch in Planung.') },
                { text: 'Zurück', info: '', aktion: () => this.zeigeMenue('haupt') },
            ];
        if (name === 'online') {
            eintraege.length = 0;
            eintraege.push(
                { text: 'Raum erstellen', info: 'Du bist der Gastgeber und bekommst einen Code für deine Freunde.', aktion: () => this.scene.start('LobbyScene', { rolle: 'host' }) },
                { text: 'Raum beitreten', info: 'Gib den Code deines Freundes ein.', aktion: () => this.scene.start('LobbyScene', { rolle: 'gast' }) },
                { text: 'Zurück', info: '', aktion: () => this.zeigeMenue('mehrspieler') },
            );
        }
        this.eintraege = eintraege;
        this.untertitel.setText(name === 'haupt' ? '' : (name === 'online' ? 'ONLINE' : 'MEHRSPIELER'));

        const y0 = name === 'haupt' ? 255 : 245, abstand = 64;
        eintraege.forEach((e, i) => {
            const y = y0 + i * abstand;
            e.rahmen = this.add.rectangle(480, y, 460, 48, 0x1b2630, 0.9).setStrokeStyle(2, 0x44525e);
            e.label = this.add.text(480, y, e.text + (e.demnaechst ? '   (demnächst)' : ''), {
                fontSize: '24px', color: e.demnaechst ? '#6f7d88' : '#e6edf2',
            }).setOrigin(0.5);
            // Maus: Darüberfahren wählt aus, Klick bestätigt
            e.rahmen.setInteractive({ useHandCursor: true });
            e.rahmen.on('pointerover', () => this.waehle(i));
            e.rahmen.on('pointerdown', () => this.bestaetige());
            this.menuObjekte.push(e.rahmen, e.label);
        });
        this.waehle(0);
    }

    // Hebt einen Eintrag hervor und zeigt seine Beschreibung.
    waehle(i) {
        if (this.auswahl !== i) sfx.play('hit');
        this.auswahl = i;
        this.eintraege.forEach((e, k) => {
            const aktiv = k === i;
            e.rahmen.setStrokeStyle(aktiv ? 3 : 2, aktiv ? 0xffdd55 : 0x44525e);
            e.rahmen.setFillStyle(aktiv ? 0x2a3846 : 0x1b2630, 0.95);
            if (!e.demnaechst) e.label.setColor(aktiv ? '#ffdd55' : '#e6edf2');
        });
        this.beschreibung.setText(this.eintraege[i].info).setColor('#cfd8dc');
    }

    bestaetige() {
        const e = this.eintraege[this.auswahl];
        sfx.play(e.demnaechst ? 'hurt' : 'pickup');
        e.aktion();
    }

    // Startet das Spiel im gewählten Modus ('einzel'; später 'online' und 'lokal').
    starte(modus) {
        this.registry.set('modus', modus);
        this.scene.start('GameScene');
    }

    update() {
        const k = this.tasten, n = this.eintraege.length, J = Phaser.Input.Keyboard.JustDown;
        if (J(k.DOWN) || J(k.S)) this.waehle((this.auswahl + 1) % n);
        if (J(k.UP) || J(k.W)) this.waehle((this.auswahl + n - 1) % n);
        if (J(k.ENTER) || J(k.SPACE)) this.bestaetige();
        if (J(k.ESC) && this.menue !== 'haupt') this.zeigeMenue(this.menue === 'online' ? 'mehrspieler' : 'haupt');
    }
}
