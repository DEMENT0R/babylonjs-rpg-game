/**
 * Побочные импорты Babylon: без них часть API молча не работает
 * (динамические текстуры, пикинг лучом). Импортируется первым.
 */
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture';
import '@babylonjs/core/Culling/ray';

export {};
