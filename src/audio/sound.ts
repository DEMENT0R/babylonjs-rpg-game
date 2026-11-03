/**
 * Звук без файлов: ветер, гул подъезда, шаги и удары собираются из шума
 * и синусоид. Ни одного килобайта ассетов, и всё это сразу в браузере.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      this.enabled = false;
      return;
    }
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.noiseBuffer = this.makeNoise(ctx, 2.0);

    // ветер: шум через полосовой фильтр, медленно гуляющий
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.05;
    wind.connect(windFilter).connect(this.windGain).connect(this.master);
    wind.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start();

    // гул дома: две низкие синусоиды и тихий шумовой слой
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.master);
    for (const freq of [47, 94]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = freq === 47 ? 0.05 : 0.02;
      osc.connect(g).connect(this.humGain);
      osc.start();
    }
    const humNoise = ctx.createBufferSource();
    humNoise.buffer = this.noiseBuffer;
    humNoise.loop = true;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 240;
    const humNoiseGain = ctx.createGain();
    humNoiseGain.gain.value = 0.03;
    humNoise.connect(humFilter).connect(humNoiseGain).connect(this.humGain);
    humNoise.start();
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Снаружи ветер громче, внутри — гул. */
  setOutdoor(outdoor: boolean): void {
    if (!this.ctx || !this.windGain || !this.humGain) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(outdoor ? 0.11 : 0.02, t, 1.4);
    this.humGain.gain.setTargetAtTime(outdoor ? 0.0 : 1.0, t, 1.2);
  }

  /** Шаг: короткий шумовой всплеск с фильтром под поверхность. */
  step(surface: 'snow' | 'floor' | 'stairs'): void {
    if (!this.ctx || !this.noiseBuffer || !this.master) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.9 + Math.random() * 0.3;
    const filter = ctx.createBiquadFilter();
    filter.type = surface === 'snow' ? 'highpass' : 'lowpass';
    filter.frequency.value = surface === 'snow' ? 1700 : surface === 'stairs' ? 900 : 700;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const peak = surface === 'snow' ? 0.09 : 0.05;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(now);
    src.stop(now + 0.2);
  }

  /** Удар по человеку: низкий тон с падением и шум. */
  hit(heavy = false): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 120 : 90, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.22);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(heavy ? 0.4 : 0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Игрок получил урон: глухой толчок и короткий звон. */
  hurt(): void {
    this.hit(true);
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2100, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  /** Тихий щелчок интерфейса. */
  ui(): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Ближний бой: звук удара по телу. */
  strike(): void {
    this.hit(false);
  }
}
