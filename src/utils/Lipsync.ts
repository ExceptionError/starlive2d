/**
 * リップシンクの動作モード
 */
export const Lipsync = {
  /**
   * リップシンクさせない
   */
  Off: 0,
  /**
   * 音声再生時にその音量でリップシンクする
   * アナライザーの関係でクロスオリジンの場合音声が再生されなくなる
   * クロスオリジンの場合やリップシンクが微妙な場合はDummyを利用するとよい
   */
  Sync: 1,
  /**
   * 音声再生時にダミーの口パクモーションを適用する
   */
  Dummy: 2,
} as const;

export type Lipsync = typeof Lipsync[keyof typeof Lipsync];
