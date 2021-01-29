import { Model } from '../model';
import { PixiModel } from '../model/PixiModel';
import { Source } from '../model/type';
import { ModelFactoryOptions } from './ModelFactory';

/**
 * Pixiモデルファクトリ
 * ベースモデルを取り込む形での実装となっている
 */
export class PixiModelFactory {
  public static async setup(
    model: PixiModel,
    source: Source,
    gl: WebGLRenderingContext,
    options: Omit<ModelFactoryOptions, 'pixi'>
  ): Promise<PixiModel> {
    const pixiOptions = Object.assign(options, { pixi: true });
    const baseModel = await Model.create(source, gl, pixiOptions);
    model.baseModel = baseModel;
    return model;
  }
}
