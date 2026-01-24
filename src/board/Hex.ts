/**
 * Базовые типы и функции для работы с гексагональными координатами
 * Использует axial coordinate system (q, r)
 */

import { EDGE_DIRECTIONS, getAllNeighbors } from "./HexEdges";

export type HexCoord = Readonly<{ q: number; r: number }>;

// Re-export для обратной совместимости
export const HEX_DIRS: readonly HexCoord[] = EDGE_DIRECTIONS;

/**
 * Создать уникальный ключ для гекса (для Map/Set)
 */
export function hexKey(c: HexCoord): string {
    return `${c.q},${c.r}`;
}

/**
 * Сложить две координаты
 */
export function addHex(a: HexCoord, b: HexCoord): HexCoord {
    return { q: a.q + b.q, r: a.r + b.r };
}

/**
 * Получить всех соседей гекса
 */
export function neighbors(c: HexCoord): HexCoord[] {
    return getAllNeighbors(c);
}

/**
 * Проверить, являются ли два гекса соседями
 */
export function isNeighbor(a: HexCoord, b: HexCoord): boolean {
    return HEX_DIRS.some((d) => a.q + d.q === b.q && a.r + d.r === b.r);
}

/**
 * Расстояние между двумя гексами (в гексах)
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}
