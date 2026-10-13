import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import { breiteFuerFenster, haltePassend, SPIEL_HOEHE } from './Anpassung.js';

// Die Konfiguration beschreibt unser Spiel: Größe, Physik und welche Szenen es gibt.
const config = {
    type: Phaser.AUTO,       // Phaser wählt selbst die beste Darstellungsart (WebGL oder Canvas)
    width: breiteFuerFenster(),   // Breite des Spielfensters: richtet sich nach der Fensterform (1280 bis 1800), damit nichts schwarz bleibt
    height: SPIEL_HOEHE,          // Höhe des Spielfensters in Pixeln
    // FIT: Das Spiel wird passend ins Browserfenster eingepasst und mittig angezeigt.
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },   // zentriert wird per CSS (index.html); beides zusammen würde das Bild nach rechts verschieben
    backgroundColor: '#3a4a5a',
    physics: {
        default: 'arcade',   // Einfache, schnelle 2D-Physik
        arcade: {
            gravity: { y: 900 },  // Schwerkraft nach unten (Pixel pro Sekunde²)
            debug: false          // true zeigt Kollisionsboxen – hilfreich zum Lernen
        }
    },
    scene: [MenuScene, GameScene, PauseScene, LobbyScene]  // die erste (Menü) startet automatisch
};

const game = new Phaser.Game(config);
haltePassend(game);
