import { CubismDefaultParameterId } from '@cubism/cubismdefaultparameterid';
import { BreathParameterData, CubismBreath } from '@cubism/effect/cubismbreath';
import { CubismEyeBlink } from '@cubism/effect/cubismeyeblink';
import { CubismPose } from '@cubism/effect/cubismpose';
import { CubismIdHandle } from '@cubism/id/cubismid';
import { CubismFramework } from '@cubism/live2dcubismframework';
import { CubismModelMatrix } from '@cubism/math/cubismmodelmatrix';
import { CubismTargetPoint } from '@cubism/math/cubismtargetpoint';
import { CubismMoc } from '@cubism/model/cubismmoc';
import { CubismModelUserData } from '@cubism/model/cubismmodeluserdata';
import { CubismExpressionMotion } from '@cubism/motion/cubismexpressionmotion';
import { CubismMotion } from '@cubism/motion/cubismmotion';
import { CubismMotionManager } from '@cubism/motion/cubismmotionmanager';
import { CubismPhysics } from '@cubism/physics/cubismphysics';
import { CubismRenderer_WebGL } from '@cubism/rendering/cubismrenderer_webgl';
import { csmMap } from '@cubism/type/csmmap';
import { csmVector } from '@cubism/type/csmvector';
import { MIPMAP_MODES, Texture as PixiTexture } from 'pixi.js';
import {
  CubismModelSetting,
  Source,
  Texture,
  Model,
  MotionsMap,
  ExpressionMap,
  MotionSoundsMap,
} from '../model';
import { SoundManager } from '../sound';
import { Lipsync } from '../utils';
import { ModelFactoryContext } from './ModelFactoryContext';
import { ModelFactoryOptions } from './ModelFactoryOptions';

/**
 * 設定
 * JSONデータをベースとしつつ、相対パスを解決するためにurlを追加で持つ
 */
type Setting = CubismSpec.ModelJSON & {
  url: string;
};

/**
 * モデルファクトリ
 */
export class ModelFactory {
  /**
   * モデルを構築する
   * @param model
   * @param source
   * @param gl
   * @param options
   */
  public static async setup(
    model: Model,
    source: Source,
    gl: WebGLRenderingContext,
    options: ModelFactoryOptions
  ): Promise<Model> {
    const setting = await resolveSetting(source);

    // URLからディレクトリ解決
    const url = setting.url;
    const dir = url.split('/').slice(0, -1).join('/');

    const cubismSetting = new CubismModelSetting(setting);

    const context: ModelFactoryContext = {
      gl,
      dir,
      setting,
      cubismSetting,
      options,
    };

    // 同期処理の実行
    const [eyeBlink, breath, eyeBlinkIds, lipSyncIds, layout] = [
      loadEyeBlink(context),
      loadBreath(),
      loadEyeBlinkIds(context),
      loadLipSyncIds(context),
      loadLayout(context),
    ];
    // 非同期処理の実行
    const [
      textures,
      moc,
      expressions,
      motions,
      motionSounds,
      physics,
      pose,
      userData,
    ] = await Promise.all([
      options.pixi ? loadPixiTextures(context) : loadTextures(context),
      loadMoc(context),
      loadExpressions(context),
      loadMotions(context),
      loadMotionSounds(context),
      loadPhysics(context),
      loadPose(context),
      loadUserData(context),
    ]);

    // Live2Dモデルを構築
    if (moc === null) {
      return Promise.reject('null moc, model.');
    }
    const cubismModel = moc.createModel();
    if (cubismModel === null) {
      return Promise.reject('null cubism model.');
    }

    const cubismModelMatrix = new CubismModelMatrix(
      cubismModel.getCanvasWidth(),
      cubismModel.getCanvasHeight()
    );
    cubismModelMatrix.setupFromLayout(layout);

    // モーションに目パチとリップシンクを関連付ける
    Object.values(motions).forEach((motion) => {
      motion.setEffectIds(eyeBlinkIds, lipSyncIds);
    });

    // モーションマネージャーを作成
    const cubismMotionManager = new CubismMotionManager();
    cubismMotionManager.setEventCallback((caller, eventValue, customData) => {
      // 今のところコールバックを利用するための実装は用意していません
    }, model);
    cubismMotionManager.stopAllMotions();

    // 表情マネージャーを作成
    const cubismExpressionManager = new CubismMotionManager();

    // ドラッグによるアニメーション
    const cubismTargetPoint = new CubismTargetPoint();

    // レンダラを作成
    const renderer = new CubismRenderer_WebGL();
    renderer.initialize(cubismModel);
    renderer.setIsPremultipliedAlpha(true);
    renderer.startUp(context.gl);

    // 標準テクスチャの場合ここでレンダラにセットする
    if (!options.pixi) {
      textures.forEach((texture, i) => {
        renderer.bindTexture(i, texture);
      });
    }

    // サウンドマネージャーは自前実装
    const soundManager = new SoundManager();
    soundManager.lipSync = context.options.lipSync ?? Lipsync.Off;
    const lipSyncWeight = context.options.lipSyncWeight ?? 0.8; // 0.8はLive2Dのサンプル実装でもされていた定数

    // 各種プロパティをモデルにセットする
    // 色々と試行錯誤するにあたって、ひとまず全部入っていれば困らないという形
    model.eyeBlink = eyeBlink;
    model.breath = breath;
    model.eyeBlinkIds = eyeBlinkIds;
    model.lipSyncIds = lipSyncIds;
    model.layout = layout;

    model.textures = textures;
    model.moc = moc;
    model.expressions = expressions;
    model.motions = motions;
    model.motionSounds = motionSounds;
    model.physics = physics;
    model.pose = pose;
    model.userData = userData;

    model.cubismModel = cubismModel;
    model.cubismModelMatrix = cubismModelMatrix;
    model.cubismMotionManager = cubismMotionManager;
    model.cubismExpressionManager = cubismExpressionManager;
    model.cubismTargetPoint = cubismTargetPoint;
    model.renderer = renderer;

    model.cubismModelSetting = cubismSetting;

    model.soundManager = soundManager;
    model.lipSyncWeight = lipSyncWeight;

    return Promise.resolve(model);
  }
}

/**
 * 設定の解決
 * 文字列を指定した場合はそれをURLと見なして取得する
 * JSONデータの場合はそれをそのまま返す
 * @param source
 */
const resolveSetting = async (
  source: Record<string, unknown> | string
): Promise<Setting> => {
  if (typeof source === 'string') {
    const response = await fetch(source);
    const data = await response.json();
    data.url = source;
    return data;
  } else {
    return (source as unknown) as Setting;
  }
};

/**
 * 文字列をArrayBufferに変換する
 * @param src
 */
const stringToBuffer = (src: string): ArrayBuffer => {
  const charCodeAt = (c: string) => c.charCodeAt(0);
  const charCodes = [].map.call(src, charCodeAt);
  return new Uint8Array(charCodes).buffer;
};

/**
 * 標準テクスチャの読み込み
 * @param context
 */
const loadTextures = async (
  context: ModelFactoryContext
): Promise<Texture[]> => {
  const gl = context.gl;
  const textures = context.setting.FileReferences.Textures;
  const loading = textures.map((texture) => {
    return new Promise<WebGLTexture>((resolve) => {
      const url = `${context.dir}/${texture}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = (): void => {
        const disableMipmap = context.options.mipmap === false;
        const tex = createTexture(gl, img, true, !disableMipmap);
        resolve(tex);
      };
      img.src = url;
    });
  });
  return Promise.all(loading);
};

/**
 * 標準テクスチャの構築
 * @param gl
 * @param source
 * @param usePremultiply
 * @param generateMipmap
 */
const createTexture = (
  gl: WebGLRenderingContext,
  source: TexImageSource,
  usePremultiply: boolean,
  generateMipmap: boolean
): WebGLTexture => {
  const tex = gl.createTexture();
  if (!tex) {
    throw new Error('failed create texture.');
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const minFilter = generateMipmap ? gl.LINEAR_MIPMAP_NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (usePremultiply) {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  if (generateMipmap) {
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
};

/**
 * Pixiテクスチャの読み込み
 * @param context
 */
const loadPixiTextures = async (
  context: ModelFactoryContext
): Promise<Texture[]> => {
  const textures = context.setting.FileReferences.Textures;
  const loading = textures.map((texture) => {
    const url = `${context.dir}/${texture}`;
    // mipmapはオプションでfalseが指定されている時だけ無効にする
    const disableMipmap = context.options.mipmap === false;
    const mipmap = disableMipmap ? MIPMAP_MODES.OFF : MIPMAP_MODES.POW2;
    return PixiTexture.fromURL(url, { mipmap });
  });
  return Promise.all(loading);
};

/**
 * Live2Dモデルの読み込み
 * @param context
 */
const loadMoc = async (context: ModelFactoryContext): Promise<CubismMoc> => {
  const fileName = context.setting.FileReferences.Moc;
  const url = `${context.dir}/${fileName}`;
  const arrayBuffer = await fetch(url).then((response) =>
    response.arrayBuffer()
  );
  return CubismMoc.create(arrayBuffer);
};

/**
 * 表情データの読み込み
 * @param context
 */
const loadExpressions = async (
  context: ModelFactoryContext
): Promise<ExpressionMap> => {
  const expressions = context.setting.FileReferences.Expressions;
  if (!expressions) return {};

  const map: ExpressionMap = {};
  expressions.forEach(async (expression) => {
    const fileName = expression.File;
    const url = `${context.dir}/${fileName}`;
    const arrayBuffer = await fetch(url).then((response) =>
      response.arrayBuffer()
    );
    map[expression.Name] = CubismExpressionMotion.create(
      arrayBuffer,
      arrayBuffer.byteLength
    );
  });
  return map;
};

/**
 * モーションデータの読み込み
 * @param context
 */
const loadMotions = async (
  context: ModelFactoryContext
): Promise<MotionsMap> => {
  const motions = context.setting.FileReferences.Motions;
  if (!motions) return {};

  // モーションは1つの名前に複数のモーションデータを紐づけることができる
  // 構築データではフラットにモーションデータを持たせている
  // 例:
  // 「Idle」に2つのモーションデータが紐づけられている場合は
  // 「Idle_0」「Idle_1」をキーに持つマップを返す
  const map: MotionsMap = {};
  Object.entries(motions).forEach(async ([key, motions]) => {
    motions.forEach(async (motion, index) => {
      // モーションデータの取得
      const fileName = motion.File;
      const url = `${context.dir}/${fileName}`;
      const arrayBuffer = await fetch(url).then((response) =>
        response.arrayBuffer()
      );
      // モーションデータの構築
      const mtn = CubismMotion.create(arrayBuffer, arrayBuffer.byteLength);
      // フェードイン・フェードアウトが定義されている場合はモーションデータに登録する
      const fadeInTime = motion.FadeInTime;
      if (fadeInTime !== undefined && fadeInTime >= 0.0) {
        mtn.setFadeInTime(fadeInTime);
      }
      const fadeOutTime = motion.FadeOutTime;
      if (fadeOutTime !== undefined && fadeOutTime >= 0.0) {
        mtn.setFadeOutTime(fadeOutTime);
      }
      // マップに追加する
      const k = `${key}_${index}`;
      map[k] = mtn;
    });
  });
  return map;
};

/**
 * モーションサウンドデータの読み込み
 * @param context
 */
const loadMotionSounds = async (
  context: ModelFactoryContext
): Promise<MotionSoundsMap> => {
  if (context.options.motionWithSound !== true) return {};
  const motions = context.setting.FileReferences.Motions;
  if (!motions) return {};

  const map: MotionSoundsMap = {};
  Object.entries(motions).forEach(async ([key, motions]) => {
    motions.forEach(async (motion, index) => {
      // マップに追加する
      if (motion.Sound) {
        const k = `${key}_${index}`;
        const url = `${context.dir}/${motion.Sound}`;
        map[k] = url;
        // そのまま利用するわけではないがキャッシュするためここで取得する
        await fetch(url);
      }
    });
  });
  return map;
};

/**
 * 物理演算データの読み込み
 * @param context
 */
const loadPhysics = async (
  context: ModelFactoryContext
): Promise<null | CubismPhysics> => {
  const fileName = context.setting.FileReferences.Physics;
  if (!fileName) return null;
  const url = `${context.dir}/${fileName}`;
  const arrayBuffer = await fetch(url).then((response) =>
    response.arrayBuffer()
  );
  return CubismPhysics.create(arrayBuffer, arrayBuffer.byteLength);
};

/**
 * ポーズデータの読み込み
 * @param context
 */
const loadPose = async (context: ModelFactoryContext): Promise<CubismPose> => {
  const fileName = context.setting.FileReferences.Pose;
  if (!fileName) return null;
  const url = `${context.dir}/${fileName}`;
  const arrayBuffer = await fetch(url).then((response) =>
    response.arrayBuffer()
  );
  return CubismPose.create(arrayBuffer, arrayBuffer.byteLength);
};

/**
 * 目パチデータの読み込み
 * @param context
 */
const loadEyeBlink = (context: ModelFactoryContext): CubismEyeBlink => {
  const count = context.cubismSetting.getEyeBlinkParameterCount();
  if (count <= 0) return null;
  return CubismEyeBlink.create(context.cubismSetting);
};

/**
 * ブレスデータの読み込み
 * 正確には読み込むではなく構築
 * Live2D公式のサンプルでもこのような構築がなされていた
 */
const loadBreath = (): CubismBreath => {
  const idManager = CubismFramework.getIdManager();
  const ParamAngleXId = idManager.getId(CubismDefaultParameterId.ParamAngleX);
  const ParamAngleYId = idManager.getId(CubismDefaultParameterId.ParamAngleY);
  const ParamAngleZId = idManager.getId(CubismDefaultParameterId.ParamAngleZ);
  const ParamBodyAngleXId = idManager.getId(
    CubismDefaultParameterId.ParamBodyAngleX
  );
  const ParamBreathId = idManager.getId(CubismDefaultParameterId.ParamBreath);

  const breathParameters: csmVector<BreathParameterData> = new csmVector();
  breathParameters.pushBack(
    new BreathParameterData(ParamAngleXId, 0.0, 15.0, 6.5345, 0.5)
  );
  breathParameters.pushBack(
    new BreathParameterData(ParamAngleYId, 0.0, 8.0, 3.5345, 0.5)
  );
  breathParameters.pushBack(
    new BreathParameterData(ParamAngleZId, 0.0, 10.0, 5.5345, 0.5)
  );
  breathParameters.pushBack(
    new BreathParameterData(ParamBodyAngleXId, 0.0, 4.0, 15.5345, 0.5)
  );
  breathParameters.pushBack(
    new BreathParameterData(ParamBreathId, 0.0, 0.5, 3.2345, 0.5)
  );

  const breath = CubismBreath.create();
  breath.setParameters(breathParameters);
  return breath;
};

/**
 * ユーザーデータの読み込み
 * @param context
 */
const loadUserData = async (
  context: ModelFactoryContext
): Promise<null | CubismModelUserData> => {
  const fileName = context.setting.FileReferences.UserData;
  if (!fileName) return null;
  const url = `${context.dir}/${fileName}`;
  const arrayBuffer = await fetch(url).then((response) =>
    response.arrayBuffer()
  );
  return CubismModelUserData.create(arrayBuffer, arrayBuffer.byteLength);
};

/**
 * 目パチIDの読み込み
 * @param context
 */
const loadEyeBlinkIds = (
  context: ModelFactoryContext
): csmVector<CubismIdHandle> => {
  const ids = new csmVector<CubismIdHandle>();
  const count = context.cubismSetting.getEyeBlinkParameterCount();
  for (let i = 0; i < count; ++i) {
    ids.pushBack(context.cubismSetting.getEyeBlinkParameterId(i));
  }
  return ids;
};

/**
 * リップシンクIDの読み込み
 * @param context
 */
const loadLipSyncIds = (
  context: ModelFactoryContext
): csmVector<CubismIdHandle> => {
  const ids = new csmVector<CubismIdHandle>();
  const count = context.cubismSetting.getLipSyncParameterCount();
  for (let i = 0; i < count; ++i) {
    ids.pushBack(context.cubismSetting.getLipSyncParameterId(i));
  }
  return ids;
};

/**
 * レイアウトデータの読み込み
 * @param context
 */
const loadLayout = (context: ModelFactoryContext): csmMap<string, number> => {
  const layout = new csmMap<string, number>();
  context.cubismSetting.getLayoutMap(layout);
  return layout;
};
