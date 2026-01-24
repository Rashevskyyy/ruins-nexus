import * as PIXI from "pixi.js";
import { createInitialState } from "./core/GameState";
import { Game } from "./core/Game";
import { GameRenderer } from "./render/GameRenderer";

const app = new PIXI.Application();
await app.init({
    resizeTo: window,
    backgroundAlpha: 1,
    backgroundColor: 0x7fc9f2,
});

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.documentElement.style.overflow = "hidden";
app.canvas.style.display = "block";
document.body.appendChild(app.canvas);

const game = new Game(createInitialState());
const renderer = new GameRenderer(app, game);

renderer.renderAll();

window.addEventListener("resize", () => {
    renderer.renderAll();
});

window.addEventListener("keydown", (e) => {
    // Работает независимо от раскладки (EN/RU/UA)
    switch (e.code) {
        case "Digit1":
            game.doGather();
            break;
        case "Digit2":
            game.doTrade();
            break;
        case "Digit3":
            game.doExplore();
            break;
        case "Digit4":
            // Build (MVP: not implemented yet)
            break;
        default:
            return;
    }

    // чтобы не было побочных эффектов типа скролла/быстрого поиска
    e.preventDefault();
    renderer.renderAll();
});
