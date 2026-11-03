import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { makeRng, type Rng } from '../core/rng';

type Ctx = CanvasRenderingContext2D;

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

  /** Фасад панельки: 4 окна × 4 этажа в одной текстуре, дальше тайлинг. */
  facade(seed: number, u = 1, v = 1): Texture {
    return this.make(`facade:${seed}`, 512, 512, (ctx, w, h, rng) => {
      const cellW = w / 4;
      const cellH = h / 4;
      ctx.fillStyle = '#7c7f82';
      ctx.fillRect(0, 0, w, h);

      // швы панелей
      ctx.strokeStyle = 'rgba(38,41,44,0.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(w, i * cellH);
        ctx.stroke();
      }
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, h);
        ctx.stroke();
      }
      noise(ctx, w, h, rng, 0.10, 7000);
      stains(ctx, w, h, rng, 18, 'rgba(30,34,38,0.14)');

      // окна
      const litChance = 0.16;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const ox = col * cellW;
          const oy = row * cellH;
          const ww = cellW * 0.52;
          const wh = cellH * 0.46;
          const wx = ox + (cellW - ww) / 2;
          const wy = oy + cellH * 0.24;

          // проём глубже стены
          ctx.fillStyle = 'rgba(24,26,29,0.9)';
          ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);

          const lit = rng() < litChance;
          if (lit) {
            const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
            g.addColorStop(0, 'rgba(198,158,96,0.92)');
            g.addColorStop(1, 'rgba(140,104,58,0.75)');
            ctx.fillStyle = g;
          } else {
            const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
            g.addColorStop(0, 'rgba(52,58,64,0.95)');
            g.addColorStop(1, 'rgba(34,38,43,0.95)');
            ctx.fillStyle = g;
          }
          ctx.fillRect(wx, wy, ww, wh);

          // переплёт
          ctx.strokeStyle = lit ? 'rgba(60,50,38,0.85)' : 'rgba(18,20,23,0.9)';
          ctx.lineWidth = 4;
          ctx.strokeRect(wx, wy, ww, wh);
          ctx.beginPath();
          ctx.moveTo(wx + ww / 2, wy);
          ctx.lineTo(wx + ww / 2, wy + wh);
          ctx.moveTo(wx, wy + wh * 0.42);
          ctx.lineTo(wx + ww, wy + wh * 0.42);
          ctx.stroke();

          // подоконник и потёки
          ctx.fillStyle = 'rgba(120,124,128,0.85)';
          ctx.fillRect(wx - 8, wy + wh + 6, ww + 16, 5);
          if (rng() < 0.5) {
            ctx.fillStyle = 'rgba(28,32,36,0.15)';
            ctx.fillRect(wx - 4, wy + wh + 11, ww + 8, 40 + rng() * 60);
          }
        }
      }
    }, u, v);
  }

  /** Стена подъезда: тёмный низ, светлый верх, бордюр. */
  stairWall(u = 1, v = 1): Texture {
    return this.make('stairwall', 256, 256, (ctx, w, h, rng) => {
      ctx.fillStyle = '#8b8d84';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, rng, 0.07, 5000);
      // нижняя панель
      ctx.fillStyle = '#3f5049';
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      noise(ctx, w, h * 0.38, rng, 0.12, 3000);
      ctx.fillStyle = 'rgba(32,38,34,0.9)';
      ctx.fillRect(0, h * 0.62, w, 6);
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
      noise(ctx, w, h, rng, 0.07, 9000);
      // проталины и следы
      for (let i = 0; i < 24; i++) {
        const g = ctx.createRadialGradient(rng() * w, rng() * h, 2, rng() * w, rng() * h, 20 + rng() * 40);
        g.addColorStop(0, 'rgba(70,76,82,0.18)');
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
