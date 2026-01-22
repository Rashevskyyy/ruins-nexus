export type DiceResult = { swords: number; skulls: number };

export class DiceResolver {
    // Грани (6):
    // 3S, 2S, 1S, 1S+Skull, Skull, 2Skull
    rollHeroDie(): DiceResult {
        const face = Math.floor(Math.random() * 6);

        switch (face) {
            case 0:
                return { swords: 3, skulls: 0 };
            case 1:
                return { swords: 2, skulls: 0 };
            case 2:
                return { swords: 1, skulls: 0 };
            case 3:
                return { swords: 1, skulls: 1 };
            case 4:
                return { swords: 0, skulls: 1 };
            case 5:
                return { swords: 0, skulls: 2 };
            default:
                return { swords: 0, skulls: 0 };
        }
    }
}
