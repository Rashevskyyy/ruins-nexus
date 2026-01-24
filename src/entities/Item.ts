export type ItemType = "weapon" | "spell" | "amulet";

export type Item = {
    id: string;
    name: string;
    type: ItemType;
    // для будущего: stats, описание и т.д.
};
