import Enemy from './Enemy.js';

// Ein Brutling: klein, flink und hartnäckig. Die Kreatur ruft sie in der Arena herbei (Phase 2 und 3).
// Brutlinge schlafen am Arenarand und erwachen erst auf ihren Ruf. Sie jagen den Spieler überall in der Arena.
export default class Brut extends Enemy {
    constructor(scene, x, y, patrolLeft, patrolRight) {
        super(scene, x, y, patrolLeft, patrolRight, 26, 36, 0x8a3a6a);
        this.health = 2;
        this.speed = 110;
        this.contactDamage = 12;
        this.jagdReichweite = 3000;     // sie wissen immer, wo der Spieler ist
        this.jagdTempo = 175;
        this.leine = 3000;
        this.brut = true;               // zählt nicht als Gegner des Levels
    }
}
