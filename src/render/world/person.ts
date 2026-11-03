import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';

export interface PersonOptions {
  coat?: Color3;
  height?: number;
  /** Склонённая поза: человек что-то ищет или просто устал. */
  hunched?: boolean;
}

/**
 * Человек из коробок. Лица нет — и это правильно: в такой темноте
 * лица всё равно не разглядеть, а силуэт говорит больше.
 */
export function makePerson(
  scene: Scene,
  parent: TransformNode,
  x: number,
  y: number,
  z: number,
  yaw: number,
  opts: PersonOptions = {},
): TransformNode {
  const root = new TransformNode(`person:${x},${z}`, scene);
  root.parent = parent;
  root.position.set(x, y, z);
  root.rotation.y = yaw;

  const coat = opts.coat ?? new Color3(0.18, 0.19, 0.21);
  const mat = new StandardMaterial(`person-mat:${x},${z}`, scene);
  mat.diffuseColor = coat;
  mat.specularColor = new Color3(0.02, 0.02, 0.02);
  mat.backFaceCulling = true;

  const skin = new StandardMaterial(`skin-mat:${x},${z}`, scene);
  skin.diffuseColor = new Color3(0.42, 0.36, 0.31);
  skin.specularColor = new Color3(0.03, 0.03, 0.03);

  const h = opts.height ?? 1.78;
  const lean = opts.hunched ? 0.12 : 0;

  // ноги
  for (const side of [-1, 1]) {
    const leg = MeshBuilder.CreateBox('leg', { width: 0.17, height: h * 0.46, depth: 0.19 }, scene);
    leg.position.set(side * 0.12, h * 0.23, 0);
    leg.material = mat;
    leg.parent = root;
    leg.isPickable = false;
  }
  // корпус
  const torso = MeshBuilder.CreateBox('torso', { width: 0.46, height: h * 0.34, depth: 0.26 }, scene);
  torso.position.set(0, h * 0.62, lean * 0.2);
  torso.rotation.x = lean;
  torso.material = mat;
  torso.parent = root;
  torso.isPickable = false;
  // голова
  const head = MeshBuilder.CreateBox('head', { width: 0.2, height: 0.24, depth: 0.21 }, scene);
  head.position.set(0, h * 0.83 + lean * 0.3, lean * 0.35);
  head.material = skin;
  head.parent = root;
  head.isPickable = false;
  // шапка
  const hat = MeshBuilder.CreateBox('hat', { width: 0.22, height: 0.1, depth: 0.23 }, scene);
  hat.position.set(0, h * 0.94 + lean * 0.3, lean * 0.35);
  hat.material = mat;
  hat.parent = root;
  hat.isPickable = false;
  // руки
  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateBox('arm', { width: 0.13, height: h * 0.32, depth: 0.15 }, scene);
    arm.position.set(side * 0.3, h * 0.6, lean * 0.2);
    arm.rotation.x = lean * 0.7;
    arm.material = mat;
    arm.parent = root;
    arm.isPickable = false;
  }
  return root;
}
