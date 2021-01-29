import {
  CubismShaderSet,
  CubismShader_WebGL,
} from '@cubism/rendering/cubismrenderer_webgl';
import { csmVector } from '@cubism/type/csmvector';
import { Container, Renderer, Texture, Transform } from 'pixi.js';
import { ModelFactoryOptions, PixiModelFactory } from '../factory';
import { Model } from './Model';
import { Source } from './type';

/**
 * Pixiモデル
 */
export class PixiModel extends Container {
  /**
   * 作成する
   * @param source
   * @param gl
   * @param options
   */
  public static create(
    source: Source,
    gl: WebGLRenderingContext,
    options: Omit<ModelFactoryOptions, 'pixi'>
  ): Promise<PixiModel> {
    const model = new PixiModel();
    return PixiModelFactory.setup(model, source, gl, options);
  }

  private dt = 0;
  private contextUid = -1;
  public baseModel: Model;
  /** @override */
  public transform = new Transform();

  /**
   * Lie2Dモデルとして更新する
   * @param dt
   */
  update(dt: DOMHighResTimeStamp): void {
    // Pixiのレンダラとの兼ね合いでここでは経過時間の保存だけ行う
    this.dt += dt;
  }

  /**
   * Pixiのレンダリング処理
   * @override
   */
  protected _render(renderer: Renderer): void {
    // Live2Dのレンダリングに向けてPixiのレンダラをリセット
    renderer.batch.reset();
    renderer.geometry.reset();
    renderer.shader.reset();
    renderer.state.reset();

    // モデルの各種情報を用意
    const baseModel = this.baseModel;
    const textures = baseModel.textures;
    const cubismRenderer = baseModel.renderer;
    const cubismModelMatrix = baseModel.cubismModelMatrix;

    // Pixiのレンダラの変更を検出する
    const contextUid = (renderer as any).CONTEXT_UID;
    let shouldUpdateTexture = false;

    // レンダラの変更時にはLive2Dのレンダラもリセット＋テクスチャ更新する
    if (this.contextUid !== contextUid) {
      this.contextUid = contextUid;

      const cubismRenderer = this.baseModel.renderer;
      cubismRenderer.firstDraw = true;
      cubismRenderer._bufferData = {
        vertex: null,
        uv: null,
        index: null,
      };
      cubismRenderer.startUp(renderer.gl);
      cubismRenderer._clippingManager._currentFrameNo = contextUid;
      cubismRenderer._clippingManager._maskTexture = undefined;
      CubismShader_WebGL.getInstance()._shaderSets = new csmVector<CubismShaderSet>();

      shouldUpdateTexture = true;
    }

    // テクスチャ更新
    textures.forEach((texture: Texture, i) => {
      if (!texture.valid) return;
      // 更新が必要だったりそもそも読み込まれていない場合はPixiのレンダラにセットする
      const glTextureCheck = (texture.baseTexture as any)._glTextures[
        this.contextUid
      ];
      if (shouldUpdateTexture || !glTextureCheck) {
        renderer.texture.bind(texture.baseTexture, 0);
      }
      // 登録されなおしたものを改めて取得し、Live2Dのレンダラにセットする
      const glTexture = (texture.baseTexture as any)._glTextures[
        this.contextUid
      ];
      cubismRenderer.bindTexture(i, glTexture.texture);
      // リセットしてるので手動セット
      (texture.baseTexture as any).touched = renderer.textureGC.count;
    });

    // 経過時間分Live2Dモデルのアニメーションを進める
    if (this.dt) {
      baseModel.update(this.dt);
      this.dt = 0;
    }

    // Live2Dのモデルをこのコンテナの状態に合わせて更新する
    cubismModelMatrix.scale(
      this.scale.x,
      (renderer.width / renderer.height) * this.scale.y
    );
    cubismModelMatrix.setX(-1 + (this.x / renderer.width) * 2);
    cubismModelMatrix.setY(1 - (this.y / renderer.height) * 2);
    cubismRenderer.setMvpMatrix(cubismModelMatrix);

    // Live2Dのレンダラの状態更新
    const viewport: number[] = [0, 0, renderer.width, renderer.height];
    cubismRenderer.setIsPremultipliedAlpha(true);
    cubismRenderer.setRenderState(
      renderer.gl.getParameter(renderer.gl.FRAMEBUFFER_BINDING),
      viewport
    );

    // Live2Dのモデルをレンダリング
    cubismRenderer.drawModel();

    // 改めてPixiのレンダラをリセットして終わり
    renderer.state.reset();
    renderer.texture.reset();
  }

  /**
   * サイズ計算
   * @override
   */
  protected _calculateBounds(): void {
    this._bounds.addFrame(
      this.transform,
      0,
      0,
      this.baseModel.cubismModel.getModel().canvasinfo.CanvasWidth,
      this.baseModel.cubismModel.getModel().canvasinfo.CanvasHeight
    );
  }
}
