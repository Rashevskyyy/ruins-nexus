import type { Player } from "../entities/Player";

export class SettlementSystem {
    trade(player: Player): boolean {
        // 2 Provisions → 1 Iron
        if (player.provisions >= 2) {
            player.provisions -= 2;
            player.iron += 1;
            return true;
        }

        // 2 Timber → 1 Provisions
        if (player.timber >= 2) {
            player.timber -= 2;
            player.provisions += 1;
            return true;
        }

        return false;
    }
}
