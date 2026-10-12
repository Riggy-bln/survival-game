import GameScene from './scenes/GameScene.js';

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
    scene: [GameScene]       // Liste der Szenen; die erste startet automatisch
};

new Phaser.Game(config);
