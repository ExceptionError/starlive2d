import { ACubismMotion } from '@cubism/motion/acubismmotion';
import { CubismMotion } from '@cubism/motion/cubismmotion';
import { Texture as PixiTexture } from 'pixi.js';

export type Source = Record<string, unknown> | string;
export type Viewport = [number, number, number, number];
export type Texture = WebGLTexture | PixiTexture;
/**
 * 表情のマップ
 */
export type ExpressionMap = { [key: string]: ACubismMotion };
/**
 * モーションのマップ
 */
export type MotionsMap = { [k: string]: CubismMotion };
