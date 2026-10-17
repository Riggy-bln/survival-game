import { sfx } from '../Sound.js';
// Ein Gegenstand zum Aufsammeln. "type" bestimmt, was er bewirkt:
// 'health' (Heilung), 'ammo' (Munition), eine Waffe (pistol, rifle = Maschinengewehr, shotgun, rocket, flame) oder Nachschub (rocketAmmo, fuel).
// Er braucht keine Physik: Er liegt nur da, und die Szene prüft, ob der Spieler ihn berührt.
const TYPES = {
    health: { color: 0x44ff88, amount: 0, label: '+1 Medkit' },                // grün: Verbandskasten (wird mit H benutzt)
    ammo:   { color: 0xddaa33, amount: 15, label: '+15 Ammo' },               // gelb: gibt 15 Schuss
    rifle:  { color: 0xff7a3d, amount: 0, w: 38, h: 14, weapon: 'rifle', label: 'Machine gun!', name: 'MACHINE GUN', msg: 'NEW WEAPON: Machine gun\nHold the mouse button for automatic fire\n30 rounds per magazine' },  // orange und länglich wie eine Waffe
    shotgun:{ color: 0xb5452a, amount: 0, w: 42, h: 14, weapon: 'shotgun', label: 'Shotgun!', name: 'SHOTGUN', msg: 'NEW WEAPON: Shotgun\nSix pellets per shot: strong at close range' },
    pistol: { color: 0x9aa4ad, amount: 0, w: 28, h: 18, weapon: 'pistol', label: 'Pistol!', name: 'PISTOL', msg: 'NEW WEAPON: Pistol\nOne shot per click, 12 rounds per magazine' },
    rocket: { color: 0xd04a2a, amount: 0, w: 46, h: 16, weapon: 'rocket', label: 'Rocket launcher!', name: 'ROCKET LAUNCHER', msg: 'NEW WEAPON: Rocket launcher\nOne click, one rocket: explodes on impact\nKeep your distance!' },
    flame:  { color: 0xff9a22, amount: 0, w: 40, h: 22, weapon: 'flame', label: 'Flamethrower!', name: 'FLAMETHROWER', msg: 'NEW WEAPON: Flamethrower\nHold the mouse button: sets enemies on fire\nUses fuel, no reloading' },
    rocketAmmo: { color: 0xd04a2a, amount: 2, w: 22, h: 16, label: '+2 Rockets' },
    fuel:   { color: 0xff9a22, amount: 50, w: 18, h: 22, label: '+Fuel' },
    sword:  { color: 0xcfd8e0, amount: 0, w: 36, h: 36, label: 'Sword!' },        // silbern: Nahkampfwaffe, versteckt in den Höhlen
    grenade:{ color: 0x556b2f, amount: 2, w: 16, h: 16, label: '+2 Grenades' },  // olivgrün: 2 Granaten
};

// Name und Typ einer Waffe für die Anzeige und die Logik (Waffengegenstand -> Waffe aus WaffenKonfig.js)
export const WAFFEN_ITEMS = { pistol: 'pistol', rifle: 'rifle', shotgun: 'shotgun', rocket: 'rocket', flame: 'flame' };

// Größe (Breite, Höhe) eines Gegenstands: für die Suche nach einem freien Platz beim Ablegen einer Waffe
export function itemGroesse(type) { return [TYPES[type].w ?? 20, TYPES[type].h ?? 20]; }

export default class Pickup extends Phaser.GameObjects.Rectangle {
    // extra.zustand = { mag, res } einer abgelegten Waffe (bleibt erhalten, bis sie jemand aufhebt); extra.meta = Angaben aus WaffenPlatzierung.js
    constructor(scene, x, y, type, extra = {}) {
        // "?? 20" heißt: Gibt der Typ keine Größe an, nimm 20 Pixel.
        super(scene, x, y, TYPES[type].w ?? 20, TYPES[type].h ?? 20, TYPES[type].color);
        scene.add.existing(this);
        // Das Rechteck bleibt nur als Trefferfläche; gezeichnet und animiert wird der Gegenstand von der Szene
        // (drawPickup in GameScene.js): schwebend, mit Glanz und Funkeln.
        this.setVisible(false);
        this.phase = Math.random() * 6.28;   // jeder Gegenstand schwebt in eigenem Takt

        // Leuchtender Schein hinter dem Gegenstand, der sanft pulsiert: so findet man ihn leichter.
        this.glow = scene.add.circle(x, y, 22, TYPES[type].color, 0.25).setDepth(-1);
        scene.tweens.add({ targets: this.glow, scale: 1.5, alpha: 0.05, duration: 900, yoyo: true, repeat: -1 });

        this.type = type;
        this.amount = TYPES[type].amount;
        this.zustand = extra.zustand ?? null;
        this.meta = extra.meta ?? null;
        this.istWaffe = !!TYPES[type].weapon;
        this.waffeName = TYPES[type].weapon ?? null;     // Name der Waffe in WaffenKonfig.js (null bei Munition, Verbandskasten ...)
        this.name = TYPES[type].name ?? null;
    }

    // Beim Verschwinden auch den Schein entfernen.
    destroy(fromScene) {
        if (this.glow) this.glow.destroy();
        super.destroy(fromScene);
    }

    // Zeigt höchstens alle 2 Sekunden eine "voll"-Meldung (sonst käme sie in jedem Frame).
    // Gibt false zurück: Der Gegenstand bleibt liegen.
    meldeVoll(text) {
        const jetzt = this.scene.time.now;
        if (jetzt > (this.scene.letzteVollMeldung ?? 0)) {
            this.scene.showMessage(text);
            this.scene.letzteVollMeldung = jetzt + 2500;
        }
        return false;
    }

    // Versucht, den Gegenstand dem Spieler zu geben.
    // Gibt true zurück, wenn er benutzt wurde (und verschwindet), sonst bleibt er liegen.
    applyTo(player) {
        if (this.type === 'health') {
            // Der Verbandskasten kommt ins Inventar. Ist der Rucksack voll, bleibt er liegen.
            if (player.medkits >= player.maxMedkits) return this.meldeVoll('Medkit pouch full (H to use)');
            player.medkits += 1;
        } else if (this.type === 'ammo') {
            const r = player.gibMunition(this.amount);
            if (r === 'keine') return this.meldeVoll('Ammo (you have no gun yet)');
            if (r === 'voll') return this.meldeVoll('Ammo full');
        } else if (this.type === 'rocketAmmo' || this.type === 'fuel') {
            const waffe = this.type === 'fuel' ? 'flame' : 'rocket';
            if (player.fernwaffe !== waffe) return this.meldeVoll(this.type === 'fuel' ? 'Fuel (you carry no flamethrower)' : 'Rockets (you carry no launcher)');
            if (player.nimmNachschub(waffe, null) === 'voll') return this.meldeVoll(this.type === 'fuel' ? 'Fuel tank full' : 'Rockets full');
        } else if (this.type === 'sword') {
            if (player.hatSchwert) return false;
            player.hatSchwert = true;
            player.waehle(3);
            this.scene.showMessage('Sword found!\nKey 3 or mouse wheel: select, left click: strike\nNo ammo needed, deflects bullets');
        } else if (this.istWaffe) {
            // Schusswaffen: Mit leeren Händen wird sie sofort genommen. Trägt man dieselbe Sorte, kommt ihre Munition dazu. Trägt man eine ANDERE,
            // passiert hier nichts: Der Waffentausch (GameScene.oeffneTausch) fragt, welche man behalten will, und beide bleiben in der Welt.
            const waffe = TYPES[this.type].weapon;
            if (player.fernwaffe === null) {
                if (!player.nimmWaffe(waffe, this.zustand)) return false;
                this.scene.neueWaffe(waffe, TYPES[this.type].msg, this.meta);
            } else if (player.fernwaffe === waffe) {
                if (player.nimmNachschub(waffe, this.zustand) === 'voll') return this.meldeVoll('Ammo full');
                this.scene.showMessage('+ ' + TYPES[this.type].label.replace('!', '') + ' ammo');
            } else return false;
        }
        sfx.play('pickup');
        this.scene.fx.pickup(this.x, this.y, TYPES[this.type].color, TYPES[this.type].label);
        this.destroy();
        return true;
    }
}
