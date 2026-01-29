// ============================================================
// ENHANCED TILE RENDERER - CLEAN GRADIENT VERSION
// ============================================================
// Matches the HTML mockup with smooth gradients
// ============================================================

import * as PIXI from "pixi.js";

// ------------------------------------------------------------
// 1. ЦВЕТОВАЯ СХЕМА
// ------------------------------------------------------------

export const TileColors = {
  // Базовые цвета по тирам
  tier: {
    1: { base: 0x1a3a4a, highlight: 0x2a5a6a, glow: 0x00aaff },
    2: { base: 0x2a4a3a, highlight: 0x3a6a5a, glow: 0x00ffaa },
    3: { base: 0x4a3a5a, highlight: 0x5a4a6a, glow: 0xaa00ff },
  },

  // Специальные тайлы
  special: {
    hub: { base: 0x3a3a2a, highlight: 0x5a5a4a, glow: 0xffdd00 },
    start: { base: 0x2a3a4a, highlight: 0x3a4a5a, glow: 0x00ddff },
    final: { base: 0x5a2a3a, highlight: 0x6a3a4a, glow: 0xff0066 },
    unexplored: { base: 0x151515, highlight: 0x252525, glow: 0x333333 },
  },

  // Опасные эффекты
  risky: {
    toxic: 0x00ff00,
    unstable: 0xff6600,
    rift: 0x9900ff,
  },

  // Ресурсы
  resources: {
    biomass: 0x00ff88,
    materials: 0xffaa00,
    alloys: 0x00ddff,
  },

  // Монстры
  monster: {
    standard: 0xff4444,
    hunter: 0xff8800,
    guardian: 0x8844ff,
  },
};

// ------------------------------------------------------------
// 2. ИНТЕРФЕЙСЫ
// ------------------------------------------------------------

export interface TileRenderData {
  discovered: boolean;
  type: "hub" | "start" | "resource" | "final" | "empty";
  tier: 1 | 2 | 3;
  risky?: "toxic" | "unstable" | "rift" | null;
  resources?: {
    biomass?: number;
    materials?: number;
    alloys?: number;
  };
  monster?: {
    alive: boolean;
    tier: number;
    type: "standard" | "hunter" | "guardian";
  };
  hasBase?: boolean;
  baseOwner?: string;
}

// ------------------------------------------------------------
// 3. ОСНОВНОЙ КЛАСС
// ------------------------------------------------------------

export class EnhancedTileRenderer {
  private hexSize: number;
  private hexPoints: number[];
  private gradientCache = new Map<string, PIXI.Texture>();

  constructor(hexSize: number = 50) {
    this.hexSize = hexSize;
    this.hexPoints = this.buildHexPoints(hexSize);
  }

  private buildHexPoints(size: number): number[] {
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      pts.push(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    return pts;
  }

  // --------------------------------------------------------
  // ГЛАВНЫЙ МЕТОД
  // --------------------------------------------------------

  createTileGraphics(tile: TileRenderData): PIXI.Container {
    const container = new PIXI.Container();

    // 1. Glow эффект (под основным гексом)
    if (tile.discovered) {
      const glow = this.drawGlow(tile);
      container.addChild(glow);
    }

    // 2. Основной гекс (чистый градиент)
    const baseHex = this.drawCleanHex(tile);
    container.addChild(baseHex);

    // 3. Паттерн опасности
    if (tile.discovered && tile.risky) {
      const pattern = this.drawRiskyPattern(tile.risky);
      container.addChild(pattern);
    }

    // 4. Контент
    if (tile.discovered) {
      if (tile.hasBase) {
        const base = this.drawBaseIndicator();
        container.addChild(base);
      } else if (tile.type === "hub") {
        const hubIcon = this.drawHubIcon();
        container.addChild(hubIcon);
      } else {
        // Монстр сверху
        if (tile.monster?.alive) {
          const monster = this.drawMonsterBadge(tile.monster);
          container.addChild(monster);
        }

        // Ресурсы снизу (или по центру если нет монстра)
        if (tile.resources) {
          const resources = this.drawResources(tile.resources, !!tile.monster?.alive);
          container.addChild(resources);
        }
      }
    } else {
      const question = this.drawQuestionMark();
      container.addChild(question);
    }

    return container;
  }

  // --------------------------------------------------------
  // ЧИСТЫЙ ГЕКС БЕЗ ВИДИМЫХ ВНУТРЕННИХ СЛОЁВ
  // --------------------------------------------------------

  private drawCleanHex(tile: TileRenderData): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const colors = this.getTileColors(tile);

    // Текстурная заливка с radial gradient (как в мокапе)
    const texture = this.getGradientTexture(colors.base, colors.highlight);
    const matrix = new PIXI.Matrix();
    matrix.translate(-texture.width / 2, -texture.height / 2);

    g.poly(this.hexPoints);
    g.fill({ texture, matrix });

    // Тёмная внешняя обводка
    g.poly(this.hexPoints);
    g.stroke({ color: 0x0a0a0a, width: 2, alpha: 1 });

    // Внутренняя тонкая обводка (как в мокапе)
    if (tile.discovered) {
      const innerPoints = this.buildHexPoints(this.hexSize - 3);
      g.poly(innerPoints);
      g.stroke({ color: 0xffffff, width: 2, alpha: 0.1 });
    }

    return g;
  }

  private getGradientTexture(base: number, highlight: number): PIXI.Texture {
    const key = `${base}-${highlight}-${this.hexSize}`;
    const cached = this.gradientCache.get(key);
    if (cached) return cached;

    const size = Math.ceil(this.hexSize * 2.4);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallback = PIXI.Texture.WHITE;
      this.gradientCache.set(key, fallback);
      return fallback;
    }

    const cx = size * 0.3;
    const cy = size * 0.3;
    const radius = size * 0.7;
    const edge = this.darkenColor(base, 0.35);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, this.toCssColor(highlight));
    grad.addColorStop(0.5, this.toCssColor(base));
    grad.addColorStop(1, this.toCssColor(edge));

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = PIXI.Texture.from(canvas);
    texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
    this.gradientCache.set(key, texture);
    return texture;
  }

  private toCssColor(color: number): string {
    const hex = color.toString(16).padStart(6, "0");
    return `#${hex}`;
  }

  private darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (color & 0xff) * (1 - amount));
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }

  private drawGlow(tile: TileRenderData): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const colors = this.getTileColors(tile);

    // Мягкий glow как в мокапе
    for (let i = 4; i >= 1; i--) {
      const glowSize = this.hexSize + i * 4;
      const glowPoints = this.buildHexPoints(glowSize);
      g.poly(glowPoints);
      g.fill({ color: colors.glow, alpha: 0.12 / i });
    }

    return g;
  }

  private drawRiskyPattern(risky: "toxic" | "unstable" | "rift"): PIXI.Container {
    const container = new PIXI.Container();
    const g = new PIXI.Graphics();
    const color = TileColors.risky[risky];
    const size = this.hexSize;

    // Маска
    const mask = new PIXI.Graphics();
    mask.poly(this.hexPoints);
    mask.fill({ color: 0xffffff });

    switch (risky) {
      case "toxic":
        // Диагональные полоски
        for (let i = -size * 2; i < size * 2; i += 14) {
          g.moveTo(i - size, -size);
          g.lineTo(i + size, size);
        }
        g.stroke({ color, width: 2, alpha: 0.15 });
        break;

      case "unstable":
        // Сетка
        for (let i = -size; i < size; i += 18) {
          g.moveTo(i, -size);
          g.lineTo(i, size);
          g.moveTo(-size, i);
          g.lineTo(size, i);
        }
        g.stroke({ color, width: 1.5, alpha: 0.2 });
        break;

      case "rift":
        // Концентрические круги
        for (let r = 12; r < size; r += 12) {
          g.circle(0, 0, r);
          g.stroke({ color, width: 1.5, alpha: 0.15 });
        }
        break;
    }

    g.mask = mask;
    container.addChild(mask);
    container.addChild(g);

    return container;
  }

  // --------------------------------------------------------
  // РЕСУРСЫ - цветные круги с эмодзи
  // --------------------------------------------------------

  private drawResources(
    resources: { biomass?: number; materials?: number; alloys?: number },
    _hasMonster: boolean
  ): PIXI.Container {
    const container = new PIXI.Container();
    const scale = this.getScale();

    const items: { type: "biomass" | "materials" | "alloys"; count: number }[] = [];

    if (resources.biomass && resources.biomass > 0) {
      items.push({ type: "biomass", count: resources.biomass });
    }
    if (resources.materials && resources.materials > 0) {
      items.push({ type: "materials", count: resources.materials });
    }
    if (resources.alloys && resources.alloys > 0) {
      items.push({ type: "alloys", count: resources.alloys });
    }

    if (items.length === 0) return container;

    const circleRadius = Math.round(10 * scale);
    const spacing = circleRadius * 2.4;
    const totalWidth = (items.length - 1) * spacing;
    let x = -totalWidth / 2;
    
    // Ресурсы всегда внизу, даже если один
    const y = this.hexSize * 0.32;

    for (const item of items) {
      const icon = this.drawResourceCircle(item.type, item.count, circleRadius);
      icon.x = x;
      icon.y = y;
      container.addChild(icon);
      x += spacing;
    }

    return container;
  }

  private drawResourceCircle(
    type: "biomass" | "materials" | "alloys",
    count: number,
    radius: number
  ): PIXI.Container {
    const container = new PIXI.Container();
    const color = TileColors.resources[type];

    // Glow под кругом
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, radius + 3);
    glow.fill({ color, alpha: 0.25 });
    container.addChild(glow);

    // Основной круг
    const circle = new PIXI.Graphics();
    circle.circle(0, 0, radius);
    circle.fill({ color, alpha: 1 });
    container.addChild(circle);

    // Эмодзи символ
    const symbols: Record<string, string> = {
      biomass: "🧬",
      materials: "🧱",
      alloys: "⚙",
    };

    const text = new PIXI.Text({
      text: symbols[type],
      style: {
        fontSize: Math.round(11 * this.getScale()),
        fontFamily: "Segoe UI Emoji, Apple Color Emoji, Arial",
      },
    });
    text.anchor.set(0.5);
    container.addChild(text);

    // Бейдж количества
    if (count > 1) {
      const badge = new PIXI.Graphics();
      badge.circle(radius - 2, -radius + 2, Math.round(6 * this.getScale()));
      badge.fill({ color: 0x000000, alpha: 0.9 });
      badge.stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
      container.addChild(badge);

      const countText = new PIXI.Text({
        text: `${count}`,
        style: {
          fontSize: Math.round(8 * this.getScale()),
          fontFamily: "Arial",
          fill: 0xffffff,
          fontWeight: "bold",
        },
      });
      countText.anchor.set(0.5);
      countText.x = radius - 2;
      countText.y = -radius + 2;
      container.addChild(countText);
    }

    return container;
  }

  // --------------------------------------------------------
  // МОНСТР - pill badge сверху тайла
  // --------------------------------------------------------

  private drawMonsterBadge(monster: {
    tier: number;
    type: "standard" | "hunter" | "guardian";
  }): PIXI.Container {
    const container = new PIXI.Container();
    const color = TileColors.monster[monster.type];
    const scale = this.getScale();

    const typeIcons: Record<string, string> = {
      standard: "",
      hunter: "🐺",
      guardian: "🛡️",
    };
    const typeIcon = typeIcons[monster.type];
    const hasIcon = typeIcon !== "";

    // Размеры pill badge
    const badgeHeight = Math.round(20 * scale);
    const badgeWidth = Math.round((hasIcon ? 48 : 30) * scale);
    const borderRadius = badgeHeight / 2;

    // Фон (pill shape)
    const bg = new PIXI.Graphics();
    bg.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, borderRadius);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    bg.stroke({ color, width: 2, alpha: 1 });
    container.addChild(bg);

    if (hasIcon) {
      // Иконка слева
      const iconText = new PIXI.Text({
        text: typeIcon,
        style: {
          fontSize: Math.round(10 * scale),
          fontFamily: "Segoe UI Emoji, Apple Color Emoji, Arial",
        },
      });
      iconText.anchor.set(0.5);
      iconText.x = Math.round(-10 * scale);
      container.addChild(iconText);

      // Тир справа
      const tierText = new PIXI.Text({
        text: `T${monster.tier}`,
        style: {
          fontSize: Math.round(11 * scale),
          fontFamily: "Arial",
          fill: color,
          fontWeight: "bold",
        },
      });
      tierText.anchor.set(0.5);
      tierText.x = Math.round(10 * scale);
      container.addChild(tierText);
    } else {
      // Только тир по центру
      const tierText = new PIXI.Text({
        text: `T${monster.tier}`,
        style: {
          fontSize: Math.round(11 * scale),
          fontFamily: "Arial",
          fill: color,
          fontWeight: "bold",
        },
      });
      tierText.anchor.set(0.5);
      container.addChild(tierText);
    }

    // Позиция - верхняя часть тайла
    container.y = -this.hexSize * 0.32;

    return container;
  }

  // --------------------------------------------------------
  // БАЗА - гекс с домиком
  // --------------------------------------------------------

  private drawBaseIndicator(): PIXI.Container {
    const container = new PIXI.Container();
    const scale = this.getScale();

    const innerSize = this.hexSize * 0.4;
    const innerPoints = this.buildHexPoints(innerSize);

    const g = new PIXI.Graphics();
    g.poly(innerPoints);
    g.fill({ color: 0x00ffff, alpha: 0.15 });
    g.stroke({ color: 0x00ffff, width: 2, alpha: 0.9 });
    container.addChild(g);

    const houseText = new PIXI.Text({
      text: "🏠",
      style: {
        fontSize: Math.round(18 * scale),
        fontFamily: "Segoe UI Emoji, Apple Color Emoji, Arial",
      },
    });
    houseText.anchor.set(0.5);
    container.addChild(houseText);

    return container;
  }

  // --------------------------------------------------------
  // HUB - UFO иконка
  // --------------------------------------------------------

  private drawHubIcon(): PIXI.Container {
    const container = new PIXI.Container();
    const scale = this.getScale();

    const ufoText = new PIXI.Text({
      text: "🛸",
      style: {
        fontSize: Math.round(26 * scale),
        fontFamily: "Segoe UI Emoji, Apple Color Emoji, Arial",
      },
    });
    ufoText.anchor.set(0.5);
    container.addChild(ufoText);

    return container;
  }

  // --------------------------------------------------------
  // НЕИССЛЕДОВАННЫЙ - знак вопроса
  // --------------------------------------------------------

  private drawQuestionMark(): PIXI.Container {
    const container = new PIXI.Container();
    const scale = this.getScale();

    const text = new PIXI.Text({
      text: "?",
      style: {
        fontSize: Math.round(22 * scale),
        fontFamily: "Arial",
        fill: 0x555555,
        fontWeight: "bold",
      },
    });
    text.anchor.set(0.5);
    container.addChild(text);

    return container;
  }

  // --------------------------------------------------------
  // УТИЛИТЫ
  // --------------------------------------------------------

  private getTileColors(tile: TileRenderData): {
    base: number;
    highlight: number;
    glow: number;
  } {
    if (!tile.discovered) {
      return TileColors.special.unexplored;
    }

    switch (tile.type) {
      case "hub":
        return TileColors.special.hub;
      case "start":
        return TileColors.special.start;
      case "final":
        return TileColors.special.final;
      case "resource":
      default:
        return TileColors.tier[tile.tier] || TileColors.tier[1];
    }
  }

  private getScale(): number {
    return this.hexSize / 60;
  }
}

// ------------------------------------------------------------
// 4. ТЕСТ
// ------------------------------------------------------------

export function createTestTiles(hexSize: number = 50): PIXI.Container {
  const renderer = new EnhancedTileRenderer(hexSize);
  const container = new PIXI.Container();

  const testCases: TileRenderData[] = [
    // Row 1: Tiers
    {
      discovered: true,
      type: "resource",
      tier: 1,
      resources: { biomass: 1 },
      monster: { alive: true, tier: 1, type: "standard" },
    },
    {
      discovered: true,
      type: "resource",
      tier: 2,
      resources: { materials: 2, alloys: 1 },
      monster: { alive: true, tier: 2, type: "hunter" },
    },
    {
      discovered: true,
      type: "resource",
      tier: 3,
      resources: { biomass: 1, materials: 1, alloys: 1 },
      monster: { alive: true, tier: 3, type: "guardian" },
    },
    // Row 2: Special
    {
      discovered: true,
      type: "hub",
      tier: 1,
    },
    {
      discovered: true,
      type: "start",
      tier: 1,
      resources: { biomass: 1, materials: 1 },
    },
    {
      discovered: false,
      type: "empty",
      tier: 1,
    },
    // Row 3: Risky
    {
      discovered: true,
      type: "resource",
      tier: 1,
      risky: "toxic",
      resources: { biomass: 2 },
      monster: { alive: true, tier: 2, type: "standard" },
    },
    {
      discovered: true,
      type: "resource",
      tier: 2,
      risky: "unstable",
      resources: { materials: 1, alloys: 1 },
      monster: { alive: true, tier: 2, type: "hunter" },
    },
    {
      discovered: true,
      type: "resource",
      tier: 3,
      risky: "rift",
      resources: { alloys: 2 },
      monster: { alive: true, tier: 3, type: "guardian" },
    },
    // Row 4: States
    {
      discovered: true,
      type: "resource",
      tier: 1,
      resources: { biomass: 1, materials: 1 },
      hasBase: true,
      baseOwner: "P1",
    },
    {
      discovered: true,
      type: "resource",
      tier: 2,
      resources: { materials: 3 },
    },
    {
      discovered: true,
      type: "final",
      tier: 3,
      monster: { alive: true, tier: 6, type: "guardian" },
    },
  ];

  const cols = 3;
  const spacingX = 120;
  const spacingY = 130;

  testCases.forEach((data, i) => {
    const tile = renderer.createTileGraphics(data);
    tile.x = (i % cols) * spacingX;
    tile.y = Math.floor(i / cols) * spacingY;
    container.addChild(tile);
  });

  return container;
}
