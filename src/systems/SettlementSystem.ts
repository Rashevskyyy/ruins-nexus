import type { Player } from "../entities/Player";

export class SettlementSystem {
    /**
     * Trade resources at Landing Hub
     */
    trade(player: Player): boolean {
        // 2 Biomass → 1 Alloys
        if (player.biomass >= 2) {
            player.biomass -= 2;
            player.alloys += 1;
            return true;
        }

        // 2 Materials → 1 Biomass
        if (player.materials >= 2) {
            player.materials -= 2;
            player.biomass += 1;
            return true;
        }

        return false;
    }
}
