import { Lipsync } from '../utils';

/**
 * 生成オプション
 */
export interface ModelFactoryOptions {
  /**
   * ミップマップを利用するか(default: true)
   * 読み込むモデルによってはノイズの原因となるのでその際にfalseを指定する
   */
  mipmap?: boolean;
  /**
   * モーションに紐づけられているサウンドを再生するか(default: false)
   */
  motionWithSound?: boolean;
  /**
   * リップシンクの利用(default: Off)
   */
  lipSync?: Lipsync;
  /**
   * リップシンクのウェイト(default: 0.8)
   */
  lipSyncWeight?: number;
  /**
   * PixiModelを利用する処理に切り替えるか(default: false)
   * テクスチャ回りの仕組みを良い感じにできなかったので用意されたオプション
   */
  pixi?: boolean;
}
