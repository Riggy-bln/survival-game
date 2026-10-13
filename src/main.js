import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';

// Die Konfiguration beschreibt unser Spiel: Größe, Physik und welche Szenen es gibt.
const config = {
    type: Phaser.AUTO,       // Phaser wählt selbst die beste Darstellungsart (WebGL oder Canvas)
    width: 960,              // Breite des Spielfensters in Pixeln
    height: 540,             // Höhe des Spielfensters in Pixeln
    backgroundColor: '#3a4a5a',
    physics: {
        default: 'arcade',   // Einfache, schnelle 2D-Physik
        arcade: {
            gravity: { y: 900 },  // Schwerkraft nach unten (Pixel pro Sekunde²)
            debug: false          // true zeigt Kollisionsboxen – hilfreich zum Lernen
        }
    },
    scene: [MenuScene, GameScene, PauseScene]  // die erste (Menü) startet automatisch
};

new Phaser.Game(config);
