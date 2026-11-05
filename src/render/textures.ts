import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { makeRng, type Rng } from '../core/rng';

type Ctx = CanvasRenderingContext2D;

/** Палитра серии панельки: бетон, швы, откосы и переплёты. */
export interface PanelPalette {
  id: string;
  base: string;
  seam: string;
  sill: string;
  frame: string;
}

/**
 * Вся графика процедурная: ни одного внешнего ассета, значит, ни одной
 * битой ссылки на GitHub Pages. Серый мир собирается из шума и краски.
 */
export class TextureLibrary {
  private cache = new Map<string, Texture>();

  constructor(private scene: Scene) {}

  private make(
    key: string,
    w: number,
    h: number,
    draw: (ctx: Ctx, w: number, h: number, rng: Rng) => void,
    u = 1,
    v = 1,
  ): Texture {
    const ck = `${key}|${u}|${v}`;
    const hit = this.cache.get(ck);
    if (hit) return hit;
    const tex = new DynamicTexture(`tex:${key}`, { width: w, height: h }, this.scene, true);
    tex.hasAlpha = false;
    const ctx = tex.getContext() as unknown as Ctx;
    draw(ctx, w, h, makeRng(hashKey(key)));
    tex.update(false);
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.WRAP_ADDRESSMODE;
    tex.uScale = u;
    tex.vScale = v;
    this.cache.set(ck, tex);
    return tex;
  }

  concrete(u = 1, v = 1): Texture {
    return this.make('concrete', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#83868a';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.16, 9000);
      stains(ctx, w, h, rng, 14, 'rgba(40,44,48,0.10)');
      cracks(ctx, w, h, rng, 5);
    }, u, v);
  }

  /**
   * Фасад типовой панельки целиком: все секции и все этажи в одной текстуре.
   * Окна заданы в метрах и рисуются одной и той же сеткой на каждом этаже,
   * поэтому стоят строго друг над другом, а не «плывут» из-за тайлинга.
   */
  panel(
    seed: number,
    sections: number,
    floors: number,
    floorHeight: number,
    palette: PanelPalette,
  ): Texture {
    const key = `panel:${seed}:${sections}:${floors}:${floorHeight}:${palette.id}`;
    const w = Math.round(sections * PANEL_SECTION_W * PANEL_PX);
    const h = Math.round(floors * floorHeight * PANEL_PX);
    return this.make(key, w, h, (ctx, cw, ch, rng) => {
      drawPanelFacade(ctx, cw, ch, rng, sections, floors, floorHeight, palette);
    });
  }

  /** Стена подъезда: тёмный низ, светлый верх, бордюр. */
  stairWall(u = 1, v = 1): Texture {
    return this.make('stairwall', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#8a8e85';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.09, 8000);
      // бордюр на уровне перил, без двухцветной панели
      ctx.fillStyle = 'rgba(96,110,101,0.4)';
      ctx.fillRect(0, h * 0.88, w, 5);
      stains(ctx, w, h, rng, 12, 'rgba(24,28,26,0.18)');
      // потёки от побелки
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = 'rgba(210,208,198,0.05)';
        ctx.fillRect(rng() * w, 0, 2 + rng() * 6, h * (0.2 + rng() * 0.5));
      }
    }, u, v);
  }

  linoleum(u = 1, v = 1): Texture {
    return this.make('linoleum', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#6a6357';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.1, 6000);
      // плиточный рисунок линолеума
      ctx.strokeStyle = 'rgba(46,42,36,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          ctx.strokeRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
        }
      }
      stains(ctx, w, h, rng, 10, 'rgba(28,26,22,0.2)');
    }, u, v);
  }

  wood(u = 1, v = 1): Texture {
    return this.make('wood', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#6b4f35';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = `rgba(${40 + rng() * 40},${28 + rng() * 30},${18 + rng() * 20},0.35)`;
        ctx.lineWidth = 1 + rng() * 3;
        const y = rng() * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + rng() * 10, w * 0.6, y - rng() * 10, w, y + rng() * 6);
        ctx.stroke();
      }
      noise(ctx, w, h, rng, 0.08, 3000);
    }, u, v);
  }

  snow(u = 1, v = 1): Texture {
    return this.make('snow', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#b9c2cb';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.12, 26000);
      // проталины и следы
      for (let i = 0; i < 9; i++) {
        const g = ctx.createRadialGradient(rng() * w, rng() * h, 8, rng() * w, rng() * h, 30 + rng() * 50);
        g.addColorStop(0, 'rgba(70,76,82,0.07)');
        g.addColorStop(1, 'rgba(70,76,82,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    }, u, v);
  }

  asphalt(u = 1, v = 1): Texture {
    return this.make('asphalt', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#3b3e42';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.22, 12000);
      stains(ctx, w, h, rng, 8, 'rgba(190,195,200,0.06)');
    }, u, v);
  }

  door(u = 1, v = 1): Texture {
    return this.make('door', 256, 512, (ctx, w, h, rng) => {
      ctx.fillStyle = '#4a3b2e';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.12, 5000);
      ctx.strokeStyle = 'rgba(24,18,12,0.7)';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.strokeRect(30, 30, w - 60, h * 0.28);
      ctx.strokeRect(30, h * 0.36, w - 60, h * 0.36);
      ctx.fillStyle = 'rgba(180,170,150,0.35)';
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.52, 7, 0, Math.PI * 2);
      ctx.fill();
      stains(ctx, w, h, rng, 10, 'rgba(20,14,8,0.25)');
    }, u, v);
  }

  metal(u = 1, v = 1): Texture {
    return this.make('metal', 128, 128, (ctx, w, h, rng) => {
      ctx.fillStyle = '#5a5f64';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.18, 3000);
      stains(ctx, w, h, rng, 6, 'rgba(112,74,40,0.25)');
    }, u, v);
  }

  /** Обои: бежевые, с выцветшим рисунком и мокрым пятном под окном. */
  wallpaper(u = 1, v = 1): Texture {
    return this.make('wallpaper', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#a89c88';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.05, 4000);
      ctx.strokeStyle = 'rgba(126,114,96,0.35)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        for (let y = 0; y < h; y += 32) {
          ctx.beginPath();
          ctx.arc(x + 16, y + 16, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      stains(ctx, w, h, rng, 8, 'rgba(60,50,40,0.12)');
    }, u, v);
  }

  /** Плитка: кухня, санузел, подъездные полы. */
  tile(u = 1, v = 1): Texture {
    return this.make('tile', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#9aa0a2';
      ctx.fillRect(0, 0, w, h);
      const s = 64;
      for (let x = 0; x < w; x += s) {
        for (let y = 0; y < h; y += s) {
          const shade = 150 + Math.floor(rng() * 40);
          ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 6})`;
          ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
          if (rng() < 0.08) {
            ctx.fillStyle = 'rgba(40,44,46,0.5)';
            ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
          }
        }
      }
      noise(ctx, w, h, rng, 0.06, 3000);
    }, u, v);
  }

  /** Стекло: тёмное, мутное, с отблеском. */
  glass(): Texture {
    return this.make('glass', 64, 64, (ctx, w, h, rng) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(28,34,40,0.94)');
      g.addColorStop(0.55, 'rgba(48,58,68,0.9)');
      g.addColorStop(1, 'rgba(20,24,28,0.96)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(190,205,220,0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, h * 0.8);
      ctx.lineTo(w * 0.7, -10);
      ctx.stroke();
      noise(ctx, w, h, rng, 0.1, 400);
    });
  }

  /** Купол неба: пасмурное, без солнца, почти без цвета. */
  sky(): Texture {
    return this.make('sky', 32, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3d444c');
      g.addColorStop(0.55, '#6d7681');
      g.addColorStop(0.78, '#9aa2ac');
      g.addColorStop(1, '#aab2ba');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }

  /** Спрайт снежинки. */
  flake(): Texture {
    return this.make('flake', 32, 32, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.45, 'rgba(240,246,252,0.55)');
      g.addColorStop(1, 'rgba(220,230,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
}

// ————— типовая панелька —————

const PANEL_SECTION_W = 12;
/** Пикселей на метр: хватает на швы и переплёты, но текстура остаётся лёгкой. */
const PANEL_PX = 28;

interface PanelWindowDef {
  /** Центр окна в метрах от левого края секции. */
  cx: number;
  w: number;
  /** Низ окна от пола этажа. */
  y: number;
  h: number;
  stair?: boolean;
}

/** Одна и та же расстановка окон на каждом этаже — это и есть типовая планировка. */
const PANEL_WINDOWS: readonly PanelWindowDef[] = [
  { cx: 1.55, w: 1.75, y: 0.85, h: 1.55 },
  { cx: 4.35, w: 1.75, y: 0.85, h: 1.55 },
  { cx: 6.0, w: 0.85, y: 1.45, h: 1.0, stair: true },
  { cx: 7.7, w: 1.75, y: 0.85, h: 1.55 },
  { cx: 10.45, w: 1.35, y: 0.9, h: 1.4 },
];

function drawPanelFacade(
  ctx: Ctx,
  w: number,
  h: number,
  rng: Rng,
  sections: number,
  floors: number,
  floorHeight: number,
  palette: PanelPalette,
): void {
  const floorPx = floorHeight * PANEL_PX;

  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, w, h);

  // Каждая комната — своя плита: тон бетона гуляет от панели к панели.
  for (let f = 0; f < floors; f++) {
    const yTop = h - (f + 1) * floorPx;
    for (let c = 0; c < sections * 4; c++) {
      const tone = rng();
      if (tone < 0.33) {
        ctx.fillStyle = `rgba(255,255,255,${0.015 + rng() * 0.03})`;
      } else if (tone > 0.62) {
        ctx.fillStyle = `rgba(0,0,0,${0.015 + rng() * 0.035})`;
      } else {
        continue;
      }
      ctx.fillRect(c * 3 * PANEL_PX, yTop, 3 * PANEL_PX, floorPx);
    }
  }

  noise(ctx, w, h, rng, 0.08, Math.round(w * h * 0.05));
  stains(ctx, w, h, rng, Math.max(12, Math.round(w / 26)), 'rgba(30,33,34,0.10)');
  cracks(ctx, w, h, rng, Math.max(6, Math.round(w / 70)));

  // Цоколь: тёмная бетонная полоса у земли, как у настоящей панельки.
  ctx.fillStyle = 'rgba(46,50,52,0.55)';
  ctx.fillRect(0, h - 0.55 * PANEL_PX, w, 0.55 * PANEL_PX);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(0, h - 0.55 * PANEL_PX, w, 2);

  // Швы: горизонтальные — по перекрытиям, вертикальные — по граням панелей.
  ctx.strokeStyle = palette.seam;
  ctx.lineWidth = 3;
  for (let f = 0; f <= floors; f++) {
    const y = Math.round(h - f * floorPx) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let s = 0; s < sections; s++) {
    for (let c = 0; c <= 4; c++) {
      // лестничная клетка занимает две панели — шва посередине нет
      if (c === 2) continue;
      if (c === 4 && s < sections - 1) continue;
      const x = Math.round((s * PANEL_SECTION_W + c * 3) * PANEL_PX) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  // Светлая фаска рядом с горизонтальным швом — чтобы читался рельеф.
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  for (let f = 0; f <= floors; f++) {
    const y = Math.round(h - f * floorPx) + 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let f = 0; f < floors; f++) {
    for (let s = 0; s < sections; s++) {
      for (const win of PANEL_WINDOWS) {
        if (win.stair && f === 0) continue;
        const x = (s * PANEL_SECTION_W + win.cx - win.w / 2) * PANEL_PX;
        const y = h - (f * floorHeight + win.y + win.h) * PANEL_PX;
        drawPanelWindow(
          ctx,
          x,
          y,
          win.w * PANEL_PX,
          win.h * PANEL_PX,
          palette,
          rng,
          Boolean(win.stair),
        );
      }
      if (f === 0) {
        drawPanelDoor(ctx, (s * PANEL_SECTION_W + 6) * PANEL_PX, h);
      }
    }
  }
}

function drawPanelWindow(
  ctx: Ctx,
  x: number,
  y: number,
  ww: number,
  wh: number,
  palette: PanelPalette,
  rng: Rng,
  stair: boolean,
): void {
  // проём сидит глубже стены
  ctx.fillStyle = 'rgba(20,22,24,0.9)';
  ctx.fillRect(x - 4, y - 5, ww + 8, wh + 10);

  const lit = rng() < (stair ? 0.04 : 0.17);
  const g = ctx.createLinearGradient(x, y, x, y + wh);
  if (lit) {
    g.addColorStop(0, 'rgba(205,166,104,0.95)');
    g.addColorStop(1, 'rgba(142,105,60,0.8)');
  } else if (stair) {
    g.addColorStop(0, 'rgba(38,44,50,0.96)');
    g.addColorStop(1, 'rgba(24,28,32,0.98)');
  } else {
    g.addColorStop(0, 'rgba(58,66,74,0.96)');
    g.addColorStop(1, 'rgba(30,35,40,0.98)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, ww, wh);

  if (!lit && !stair) {
    // занавески — единственное, что меняется от этажа к этажу
    if (rng() < 0.45) {
      ctx.fillStyle = ['#6d4a44', '#4d5a4a', '#6a5d46', '#4a4d5a'][Math.floor(rng() * 4)]!;
      const cw = ww * (0.1 + rng() * 0.14);
      ctx.fillRect(x, y, cw, wh);
      ctx.fillRect(x + ww - cw, y, cw, wh);
    }
    // редкое окно забито фанерой
    if (rng() < 0.05) {
      ctx.fillStyle = '#6b563b';
      ctx.fillRect(x, y, ww, wh);
      ctx.strokeStyle = 'rgba(40,30,18,0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y + wh * (0.2 + i * 0.3));
        ctx.lineTo(x + ww, y + wh * (0.05 + i * 0.3));
        ctx.stroke();
      }
    }
  }

  // переплёт
  ctx.strokeStyle = lit ? 'rgba(68,56,40,0.9)' : palette.frame;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, ww, wh);
  ctx.beginPath();
  ctx.moveTo(x + ww / 2, y);
  ctx.lineTo(x + ww / 2, y + wh);
  ctx.moveTo(x, y + wh * 0.4);
  ctx.lineTo(x + ww, y + wh * 0.4);
  ctx.stroke();

  // подоконник и потёк под ним
  ctx.fillStyle = palette.sill;
  ctx.fillRect(x - 5, y + wh + 4, ww + 10, 3);
  if (rng() < 0.35) {
    ctx.fillStyle = 'rgba(20,24,26,0.16)';
    ctx.fillRect(x - 3, y + wh + 7, ww + 6, 12 + rng() * 40);
  }
}

function drawPanelDoor(ctx: Ctx, cx: number, h: number): void {
  const dw = 1.5 * PANEL_PX;
  const dh = 2.2 * PANEL_PX;
  const x = cx - dw / 2;
  const y = h - dh;

  ctx.fillStyle = 'rgba(14,16,18,0.95)';
  ctx.fillRect(x - 5, y - 7, dw + 10, dh + 7);

  // металлическая дверь подъезда
  ctx.fillStyle = '#3b4044';
  ctx.fillRect(x, y, dw, dh);
  ctx.strokeStyle = '#5c6367';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 3, y + 3, dw - 6, dh - 6);

  // ручка и номер
  ctx.fillStyle = '#9aa0a2';
  ctx.fillRect(x + dw - 11, y + dh * 0.56, 4, 11);
  ctx.fillStyle = 'rgba(220,220,210,0.45)';
  ctx.fillRect(x + 7, y + 9, 13, 8);
}

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function noise(ctx: Ctx, w: number, h: number, rng: Rng, strength: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = rng() * strength;
    const dark = rng() > 0.5;
    ctx.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.8})`;
    ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
  }
}

function stains(ctx: Ctx, w: number, h: number, rng: Rng, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 8 + rng() * 50;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function cracks(ctx: Ctx, w: number, h: number, rng: Rng, count: number): void {
  ctx.strokeStyle = 'rgba(28,30,33,0.35)';
  for (let i = 0; i < count; i++) {
    let x = rng() * w;
    let y = rng() * h;
    ctx.lineWidth = 0.6 + rng();
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 4 + Math.floor(rng() * 6);
    for (let s = 0; s < steps; s++) {
      x += (rng() - 0.5) * 40;
      y += (rng() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
