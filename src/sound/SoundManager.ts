import { Lipsync } from '../utils';

export class SoundManager {
  private audioElement: HTMLAudioElement;
  private intervalId: number;

  private syncAudioContext: AudioContext;
  private syncAudioElementSource: MediaElementAudioSourceNode;
  private syncAudioAnalyser: AnalyserNode;

  // 口パクダミーモーション
  private dummyMouthParamY = [
    0.03,
    0.05,
    0.2,
    0.35,
    0.42,
    0.49,
    0.38,
    0.27,
    0.42,
    0.56,
    0.584,
    0.604,
    0.51,
    0.41,
    0.23,
    0.05,
    0.35,
    0.64,
    0.5,
    0.36,
    0.365,
    0.369,
    0.373,
    0.376,
    0.51,
    0.64,
    0.54,
    0.44,
    0.34,
    0.24,
    0.34,
    0.44,
    0.425,
    0.412,
    0.398,
    0.384,
    0.44,
    0.49,
    0.37,
    0.25,
    0.12,
  ];

  public lipSync: Lipsync.Type = Lipsync.Off;
  public lipSyncValue: number = 0;

  public playSound(url: string): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    const audio = this.audioElement || document.createElement('audio');
    if (!this.audioElement) {
      this.audioElement = audio;
    }
    audio.src = url;

    if (this.lipSync === Lipsync.Sync) {
      this.executeSync(audio);
    }
    if (this.lipSync === Lipsync.Dummy) {
      this.executeDummy(audio);
    }
    audio.play();
  }

  /**
   * 音量同期でのリップシンク
   * @param audio
   */
  private executeSync(audio: HTMLAudioElement) {
    const AudioContext = window.AudioContext;
    if (!AudioContext) return;
    // オーディオコンテキストが必要
    const context = this.syncAudioContext || new AudioContext();
    if (!this.syncAudioContext) {
      this.syncAudioContext = context;
      this.syncAudioElementSource = context.createMediaElementSource(audio);
    }
    // ソースとアナライザーを用意
    const source = this.syncAudioElementSource;
    const analyser = this.syncAudioAnalyser || context.createAnalyser();
    if (!this.syncAudioAnalyser) {
      this.syncAudioAnalyser = analyser;
    }
    // ループ処理
    analyser.fftSize = 32;
    const bufferLength = analyser.frequencyBinCount;
    let cache = [];
    let lastTime = performance.now();
    this.intervalId = setInterval(() => {
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      const value = (dataArray[9] + dataArray[10] + dataArray[11]) / 3;
      if (performance.now() - lastTime < 33) {
        // 短時間の場合は配列に突っ込む
        cache.push(value);
      } else {
        // 配列に突っ込んだ平均値を適用する
        const lipSyncValue = cache.length
          ? cache.reduce((previous, current) => (current += previous)) /
            cache.length /
            100
          : this.lipSyncValue;
        this.lipSyncValue = lipSyncValue;
        // 次の集計のためのリセット
        lastTime = performance.now();
        cache = [];
      }
    }, 0);
    // 再生が終わったらループも解除
    audio.addEventListener('ended', () => {
      clearInterval(this.intervalId);
      this.lipSyncValue = 0;
    });
    source.connect(analyser);
    analyser.connect(context.destination);
  }

  /**
   * 音声再生時にダミーの口パクモーションを適用する
   * @param audio
   */
  private executeDummy(audio: HTMLAudioElement) {
    let index = 0;
    let lastTime = performance.now();
    this.intervalId = setInterval(() => {
      // 60FPSで3フレームごとに更新する
      if (performance.now() - lastTime < (1 / 60) * 3 * 1000) return;
      // 口パクダミーモーションの値を採用する
      index = (index + 1) % this.dummyMouthParamY.length;
      this.lipSyncValue = this.dummyMouthParamY[index];
      lastTime = performance.now();
    }, 0);
    // 再生が終わったらループも解除
    audio.addEventListener('ended', () => {
      clearInterval(this.intervalId);
      this.lipSyncValue = 0;
    });
  }
}
