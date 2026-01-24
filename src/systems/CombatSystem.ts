import type { Player } from "../entities/Player";
import type { Tile } from "../board/Tile";
import { DiceResolver, type DiceResult } from "./DiceResolver";

export class CombatSystem {
    private dice = new DiceResolver();

    /**
     * Roll Hero Die (for Final Threat combat)
     */
    rollDie(): DiceResult {
        return this.dice.rollHeroDie();
    }

    /**
     * Fight local threat on a tile
     */
    fightOnce(player: Player, tile: Tile): { killed: boolean; roll: DiceResult } {
        const hp = tile.enemyHp ?? 2;
        tile.enemyHp = hp;

        const roll = this.dice.rollHeroDie();

        tile.enemyHp = Math.max(0, (tile.enemyHp ?? 0) - roll.swords);
        player.hp = Math.max(0, player.hp - roll.skulls);

        const killed = (tile.enemyHp ?? 0) <= 0;

        if (killed) {
            tile.encounterActive = false;
            tile.enemyHp = undefined;
        } else {
            tile.encounterActive = true;
        }

        return { killed, roll };
    }
}
