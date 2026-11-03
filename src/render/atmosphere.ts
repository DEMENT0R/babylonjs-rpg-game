import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Scene } from '@babylonjs/core/scene';
import type { TextureLibrary } from './textures';

export const FOG_COLOR = new Color3(0.6, 0.64, 0.69);

/** Свет, туман, небо и снег. Половина атмосферы — здесь. */
export class Atmosphere {
  private snow: ParticleSystem;
  private emitterAnchor: Vector3 = new Vector3(0, 0, 0);

  constructor(private scene: Scene, tex: TextureLibrary) {
    scene.clearColor.set(0.6, 0.64, 0.69, 1);
    scene.ambientColor = new Color3(0.22, 0.25, 0.29);

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.023;
    scene.fogColor = FOG_COLOR;

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.5;
    hemi.diffuse = new Color3(0.74, 0.79, 0.85);
    hemi.groundColor = new Color3(0.12, 0.13, 0.15);
    hemi.specular = new Color3(0.04, 0.05, 0.06);

    const sun = new DirectionalLight('sky-glow', new Vector3(-0.35, -1, -0.25), scene);
    sun.intensity = 0.32;
    sun.diffuse = new Color3(0.72, 0.78, 0.85);
    sun.specular = new Color3(0.1, 0.12, 0.14);

    // Небо: купол без солнца, просто градиент от свинца к снегу.
    const dome = MeshBuilder.CreateSphere('sky-dome', { diameter: 400, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
    dome.infiniteDistance = true;
    dome.isPickable = false;
    const domeMat = new StandardMaterial('sky-dome-mat', scene);
    domeMat.emissiveTexture = tex.sky();
    domeMat.disableLighting = true;
    domeMat.backFaceCulling = false;
    domeMat.fogEnabled = false;
    dome.material = domeMat;

    this.snow = new ParticleSystem('snow', 2600, scene);
    this.snow.particleTexture = tex.flake();
    this.snow.emitter = this.emitterAnchor;
    this.snow.minEmitBox = new Vector3(-28, 6, -28);
    this.snow.maxEmitBox = new Vector3(28, 16, 28);
    this.snow.color1.set(0.95, 0.97, 1, 0.9);
    this.snow.color2.set(0.8, 0.86, 0.94, 0.7);
    this.snow.colorDead.set(0.7, 0.75, 0.8, 0);
    this.snow.minSize = 0.035;
    this.snow.maxSize = 0.13;
    this.snow.minLifeTime = 9;
    this.snow.maxLifeTime = 18;
    this.snow.emitRate = 320;
    this.snow.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    this.snow.gravity = new Vector3(0, -1.1, 0);
    this.snow.direction1 = new Vector3(-1.2, -1.6, -0.8);
    this.snow.direction2 = new Vector3(1.6, -0.7, 1.2);
    this.snow.minAngularSpeed = -1.2;
    this.snow.maxAngularSpeed = 1.2;
    this.snow.minEmitPower = 0.6;
    this.snow.maxEmitPower = 2.2;
    this.snow.updateSpeed = 0.012;
    this.snow.start();
  }

  /** Снег идёт вокруг игрока, а не в пустой точке мира. */
  update(_dt: number, focus: Vector3): void {
    const drift = Math.sin(performance.now() * 0.00013) * 2.5;
    this.emitterAnchor.set(focus.x + drift, focus.y + 1.5, focus.z + drift * 0.4);
  }

  setIntensity(k: number): void {
    this.snow.emitRate = 320 * k;
    this.scene.fogDensity = 0.023 * (0.6 + k * 0.4);
  }

  /** Внутри дома небо светит слабее — иначе квартира выглядит как витрина. */
  setInterior(dim: number): void {
    const hemi = this.scene.getLightByName('hemi') as HemisphericLight | null;
    if (hemi) hemi.intensity = 0.5 * dim;
    const sun = this.scene.getLightByName('sky-glow') as DirectionalLight | null;
    if (sun) sun.intensity = 0.32 * dim;
  }

  dispose(): void {
    this.snow.dispose();
  }
}
