export type HexCoord = Readonly<{ q: number; r: number }>;

export const HEX_DIRS: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];

export function hexKey(c: HexCoord): string {
    return `${c.q},${c.r}`;
}

export function addHex(a: HexCoord, b: HexCoord): HexCoord {
    return { q: a.q + b.q, r: a.r + b.r };
}

export function neighbors(c: HexCoord): HexCoord[] {
    return HEX_DIRS.map((d) => addHex(c, d));
}

export function isNeighbor(a: HexCoord, b: HexCoord): boolean {
    return HEX_DIRS.some((d) => a.q + d.q === b.q && a.r + d.r === b.r);
}
