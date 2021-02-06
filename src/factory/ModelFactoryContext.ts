import { CubismModelSettingJson } from '@cubism/cubismmodelsettingjson';
import { ModelFactoryOptions } from './ModelFactoryOptions';

/**
 * 生成処理で引きまわすパラメータ
 */
export interface ModelFactoryContext {
  /**
   * Live2Dのレンダラと標準テクスチャの読み込みで必要
   */
  readonly gl: WebGLRenderingContext;
  /**
   * 最初に読み込むモデルのJSONにはそこからの相対パスでリソースが記述されている
   * それらを読み込むためにそのディレクトリのパスが必要
   */
  readonly dir: string;
  /**
   * 最初に読み込んだモデルのJSONデータ
   */
  readonly setting: CubismSpec.ModelJSON;
  /**
   * 最初に読み込んだモデルのJSONデータをLive2Dのフレームワーク向けにしたもの
   * こちらだけでも実装できるがJSONデータの構造が見えにくいので必要なところでのみ利用している
   */
  readonly cubismSetting: CubismModelSettingJson;
  /**
   * 生成オプション
   */
  readonly options: ModelFactoryOptions;
}
