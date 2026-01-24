/**
 * Единая система нумерации граней гексагона
 * 
 * Грани нумеруются по часовой стрелке, начиная с ПРАВОЙ (East):
 * 
 *          ___
 *         /   \
 *     2  /     \  1
 *       |   *   |
 *     3  \     /  0
 *         \___/
 *       4       5
 * 
 * Edge 0: EAST      (→)  → сосед (+1, 0)
 * Edge 1: NORTHEAST (↗)  → сосед (+1, -1)
 * Edge 2: NORTHWEST (↖)  → сосед (0, -1)
 * Edge 3: WEST      (←)  → сосед (-1, 0)
 * Edge 4: SOUTHWEST (↙)  → сосед (-1, +1)
 * Edge 5: SOUTHEAST (↘)  → сосед (0, +1)
 */

import type { HexCoord } from "./Hex";

export type EdgeIndex = 0 | 1 | 2 | 3 | 4 | 5;

// Названия граней для отладки
export const EDGE_NAMES: Record<EdgeIndex, string> = {
    0: "EAST",
    1: "NORTHEAST", 
    2: "NORTHWEST",
    3: "WEST",
    4: "SOUTHWEST",
    5: "SOUTHEAST",
};

// Направление к соседу через каждую грань (в axial координатах)
export const EDGE_DIRECTIONS: readonly HexCoord[] = [
    { q: 1, r: 0 },   // 0: East
    { q: 1, r: -1 },  // 1: Northeast
    { q: 0, r: -1 },  // 2: Northwest
    { q: -1, r: 0 },  // 3: West
    { q: -1, r: 1 },  // 4: Southwest
    { q: 0, r: 1 },   // 5: Southeast
] as const;

// Противоположные грани (для проверки блокировки с обеих сторон)
export const OPPOSITE_EDGE: Record<EdgeIndex, EdgeIndex> = {
    0: 3, // East ↔ West
    1: 4, // Northeast ↔ Southwest
    2: 5, // Northwest ↔ Southeast
    3: 0, // West ↔ East
    4: 1, // Southwest ↔ Northeast
    5: 2, // Southeast ↔ Northwest
};

/**
 * Углы вершин для отрисовки каждой грани (в градусах)
 * В PixiJS: 0° = вправо, 90° = вниз, 180° = влево, 270° = вверх
 * 
 * Каждая грань - это линия между двумя соседними вершинами гексагона.
 * [startAngle, endAngle] - углы от центра к вершинам
 */
export const EDGE_DRAW_ANGLES: Record<EdgeIndex, [number, number]> = {
    0: [-30, 30],     // East: верхняя правая → нижняя правая вершина
    1: [-90, -30],    // Northeast: верхняя → верхняя правая вершина
    2: [-150, -90],   // Northwest: верхняя левая → верхняя вершина
    3: [150, -150],   // West: нижняя левая → верхняя левая вершина (через 180°)
    4: [90, 150],     // Southwest: нижняя → нижняя левая вершина
    5: [30, 90],      // Southeast: нижняя правая → нижняя вершина
};

/**
 * Получить индекс грани между двумя соседними гексами
 * @param from - координаты исходного гекса
 * @param to - координаты целевого гекса
 * @returns индекс грани (0-5) или -1 если не соседи
 */
export function getEdgeToNeighbor(from: HexCoord, to: HexCoord): EdgeIndex | -1 {
    const dq = to.q - from.q;
    const dr = to.r - from.r;

    for (let i = 0; i < 6; i++) {
        const dir = EDGE_DIRECTIONS[i];
        if (dir.q === dq && dir.r === dr) {
            return i as EdgeIndex;
        }
    }

    return -1; // Не соседи
}

/**
 * Получить координаты соседа через указанную грань
 */
export function getNeighborThroughEdge(coord: HexCoord, edge: EdgeIndex): HexCoord {
    const dir = EDGE_DIRECTIONS[edge];
    return { q: coord.q + dir.q, r: coord.r + dir.r };
}

/**
 * Применить вращение к списку заблокированных граней
 * @param edges - массив индексов граней
 * @param rotation - количество поворотов на 60° по часовой стрелке (0-5)
 */
export function rotateEdges(edges: number[], rotation: number): EdgeIndex[] {
    if (rotation === 0) return edges as EdgeIndex[];
    return edges.map(edge => ((edge + rotation) % 6) as EdgeIndex);
}

/**
 * Проверить, можно ли пройти между двумя тайлами
 * Учитывает заблокированные грани с обеих сторон
 * 
 * @param fromBlockedEdges - заблокированные грани исходного тайла
 * @param toBlockedEdges - заблокированные грани целевого тайла
 * @param edgeFromSource - грань исходного тайла в направлении движения
 */
export function canPassThroughEdge(
    fromBlockedEdges: number[],
    toBlockedEdges: number[],
    edgeFromSource: EdgeIndex
): boolean {
    // Проверяем грань на исходном тайле
    if (fromBlockedEdges.includes(edgeFromSource)) {
        return false;
    }

    // Проверяем противоположную грань на целевом тайле
    const oppositeEdge = OPPOSITE_EDGE[edgeFromSource];
    if (toBlockedEdges.includes(oppositeEdge)) {
        return false;
    }

    return true;
}

/**
 * Получить координаты вершин для отрисовки грани
 * @param edge - индекс грани
 * @param hexSize - размер гексагона (расстояние от центра до вершины)
 * @returns две точки [x1, y1, x2, y2]
 */
export function getEdgeVertices(edge: EdgeIndex, hexSize: number): [number, number, number, number] {
    const [angle1Deg, angle2Deg] = EDGE_DRAW_ANGLES[edge];
    
    const angle1 = (angle1Deg * Math.PI) / 180;
    const angle2 = (angle2Deg * Math.PI) / 180;
    
    const x1 = Math.cos(angle1) * hexSize;
    const y1 = Math.sin(angle1) * hexSize;
    const x2 = Math.cos(angle2) * hexSize;
    const y2 = Math.sin(angle2) * hexSize;
    
    return [x1, y1, x2, y2];
}

/**
 * Получить все соседние координаты гекса
 */
export function getAllNeighbors(coord: HexCoord): HexCoord[] {
    return EDGE_DIRECTIONS.map(dir => ({
        q: coord.q + dir.q,
        r: coord.r + dir.r,
    }));
}

/**
 * Debug: получить строковое представление грани
 */
export function edgeToString(edge: EdgeIndex): string {
    return `Edge ${edge} (${EDGE_NAMES[edge]})`;
}
