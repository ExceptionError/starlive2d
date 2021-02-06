/**
 * リップシンクの動作モード
 */
export namespace Lipsync {
  /**
   * リップシンクの型
   */
  export type Type = typeof Off | typeof Sync | typeof Dummy;
  /**
   * リップシンクさせない
   */
  export const Off = 0;
  /**
   * 音声再生時にその音量でリップシンクする
   * アナライザーの関係でクロスオリジンの場合音声が再生されなくなる
   * クロスオリジンの場合やリップシンクが微妙な場合はDummyを利用するとよい
   */
  export const Sync = 1;
  /**
   * 音声再生時にダミーの口パクモーションを適用する
   */
  export const Dummy = 2;
}
