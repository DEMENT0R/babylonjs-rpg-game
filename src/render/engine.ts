import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';

export class Renderer {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: UniversalCamera;
  private pipeline: DefaultRenderingPipeline;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(
      canvas,
      true,
      { stencil: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false },
      true,
    );
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new Scene(this.engine);
    this.scene.skipPointerMovePicking = true;
    this.scene.autoClear = true;
    this.scene.clearColor = new Color4(0.6, 0.64, 0.69, 1);

    this.camera = new UniversalCamera('player-eye', new Vector3(0, 1.65, 0), this.scene);
    this.camera.minZ = 0.04;
    this.camera.maxZ = 700;
    this.camera.fov = 1.12;
    this.camera.inputs.clear();

    this.pipeline = new DefaultRenderingPipeline('post', true, this.scene, [this.camera]);
    this.pipeline.fxaaEnabled = true;
    this.pipeline.bloomEnabled = false;
    this.pipeline.sharpenEnabled = false;
    this.pipeline.grainEnabled = true;
    this.pipeline.grain.intensity = 14;
    this.pipeline.grain.animated = true;
    this.pipeline.chromaticAberrationEnabled = true;
    this.pipeline.chromaticAberration.aberrationAmount = 16;
    this.pipeline.chromaticAberration.radialIntensity = 0.7;

    const ip = this.pipeline.imageProcessing;
    ip.toneMappingEnabled = true;
    ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    ip.contrast = 1.26;
    ip.exposure = 1.45;
    ip.vignetteEnabled = true;
    ip.vignetteWeight = 5.5;
    ip.vignetteStretch = 0.4;
    ip.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    ip.vignetteColor = new Color4(0, 0, 0, 0);

    window.addEventListener('resize', () => this.engine.resize());
  }

  onFrame(callback: (dt: number) => void): void {
    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      callback(dt);
      this.scene.render();
    });
  }

  /** Дрожание камеры: холод, удары, бег. */
  shake(amount: number): void {
    this.camera.position.y += (Math.random() - 0.5) * amount;
  }

  setColdTint(cold: number): void {
    const ip = this.pipeline.imageProcessing;
    if (!ip.colorCurves) return;
    ip.colorCurvesEnabled = true;
    ip.colorCurves.globalSaturation = 100 - cold * 45;
  }

  dispose(): void {
    this.pipeline.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
