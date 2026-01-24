/**
 * Функции для проверки блокировки движения горами
 * Использует единую систему нумерации граней из HexEdges.ts
 */

import type { HexCoord } from "./Hex";
import type { Tile } from "./Tile";
import { 
    type EdgeIndex, 
    getEdgeToNeighbor, 
    OPPOSITE_EDGE
} from "./HexEdges";

// Re-export для обратной совместимости
export { rotateEdges as applyRotation } from "./HexEdges";

/**
 * Получить индекс грани между двумя соседними гексами
 * @deprecated Используй getEdgeToNeighbor из HexEdges.ts
 */
export function getEdgeBetween(from: HexCoord, to: HexCoord): number {
    return getEdgeToNeighbor(from, to);
}

/**
 * Получить противоположную грань
 * @deprecated Используй OPPOSITE_EDGE из HexEdges.ts
 */
export function getOppositeEdge(edge: number): number {
    return OPPOSITE_EDGE[edge as EdgeIndex];
}

/**
 * Проверяет, можно ли переместиться между двумя тайлами
 * Учитывает заблокированные грани (горы) с обеих сторон
 * 
 * @param fromTile - тайл откуда идём
 * @param toCoord - координаты куда идём
 * @param toTile - тайл куда идём (может быть null если ещё не создан)
 * @returns true если движение разрешено
 */
export function canMoveBetween(
    fromTile: Tile,
    toCoord: HexCoord,
    toTile: Tile | null
): boolean {
    const edge = getEdgeToNeighbor(fromTile.coord, toCoord);
    
    if (edge === -1) {
        return false; // Не соседи
    }

    // Проверяем грань на исходном тайле
    const fromBlocked = fromTile.blockedEdges || [];
    if (fromBlocked.includes(edge)) {
        return false; // Грань заблокирована горами
    }

    // Проверяем противоположную грань на целевом тайле
    if (toTile) {
        const oppositeEdge = OPPOSITE_EDGE[edge];
        const toBlocked = toTile.blockedEdges || [];
        if (toBlocked.includes(oppositeEdge)) {
            return false; // Противоположная грань заблокирована
        }
    }

    return true;
}
