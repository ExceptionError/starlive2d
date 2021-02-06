import { CubismModelSettingJson } from '@cubism/cubismmodelsettingjson';
import { CubismBreath } from '@cubism/effect/cubismbreath';
import { CubismEyeBlink } from '@cubism/effect/cubismeyeblink';
import { CubismPose } from '@cubism/effect/cubismpose';
import { CubismIdHandle } from '@cubism/id/cubismid';
import { CubismMatrix44 } from '@cubism/math/cubismmatrix44';
import { CubismModelMatrix } from '@cubism/math/cubismmodelmatrix';
import { CubismTargetPoint } from '@cubism/math/cubismtargetpoint';
import { CubismMoc } from '@cubism/model/cubismmoc';
import { CubismModel } from '@cubism/model/cubismmodel';
import { CubismModelUserData } from '@cubism/model/cubismmodeluserdata';
import {
  ACubismMotion,
  FinishedMotionCallback,
} from '@cubism/motion/acubismmotion';
import { CubismMotionManager } from '@cubism/motion/cubismmotionmanager';
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue,
} from '@cubism/motion/cubismmotionqueuemanager';
import { CubismPhysics } from '@cubism/physics/cubismphysics';
import { CubismRenderer_WebGL } from '@cubism/rendering/cubismrenderer_webgl';
import { csmMap } from '@cubism/type/csmmap';
import { csmVector } from '@cubism/type/csmvector';

import { ModelFactory, ModelFactoryOptions } from '../factory';
import { SoundManager } from '../sound';
import { Priority } from '../utils';
import {
  ExpressionMap,
  MotionsMap,
  MotionSoundsMap,
  Source,
  Texture,
  Viewport,
} from './type';

/**
 * ベースモデル
 */
export class Model {
  /**
   * 作成する
   * @param source
   * @param gl
   * @param options
   */
  public static create(
    source: Source,
    gl: WebGLRenderingContext,
    options: ModelFactoryOptions
  ): Promise<Model> {
    const model = new Model();
    return ModelFactory.setup(model, source, gl, options);
  }

  public eyeBlink: CubismEyeBlink;
  public breath: CubismBreath;
  public eyeBlinkIds: csmVector<CubismIdHandle>;
  public lipSyncIds: csmVector<CubismIdHandle>;
  public layout: csmMap<string, number>;

  public textures: Texture[];
  public moc: CubismMoc;
  public expressions: ExpressionMap;
  public motions: MotionsMap;
  public motionSounds: MotionSoundsMap;
  public physics: CubismPhysics | null;
  public pose: CubismPose | null;
  public userData: CubismModelUserData | null;

  public cubismModel: CubismModel;
  public cubismModelMatrix: CubismModelMatrix;
  public cubismMotionManager: CubismMotionManager;
  public cubismExpressionManager: CubismMotionManager;
  public cubismTargetPoint: CubismTargetPoint;
  public renderer: CubismRenderer_WebGL;

  public cubismModelSetting: CubismModelSettingJson;

  public soundManager: SoundManager;
  public lipSyncWeight: number;

  /**
   * Lie2Dモデルとして更新する
   * @param dt
   */
  public update(dt: DOMHighResTimeStamp): void {
    // Live2Dは秒単位で処理される
    const deltaTimeSeconds = dt / 1000;
    // モーションによるパラメータ更新の有無
    let motionUpdated = false;

    // 状態の復元
    this.cubismModel.loadParameters();
    // モーションが継続中なら更新
    if (!this.cubismMotionManager.isFinished()) {
      motionUpdated = this.cubismMotionManager.updateMotion(
        this.cubismModel,
        deltaTimeSeconds
      );
    }
    // 状態の保存
    this.cubismModel.saveParameters();

    // モーションのみ状態の復元と保存が必要
    // それ以外の状態は保存する必要がない

    // モーションの更新が無いときに目パチする
    if (!motionUpdated) {
      this.eyeBlink.updateParameters(this.cubismModel, deltaTimeSeconds);
    }

    // 表情の更新
    this.cubismExpressionManager.updateMotion(
      this.cubismModel,
      deltaTimeSeconds
    );

    // 呼吸の更新
    this.breath.updateParameters(this.cubismModel, deltaTimeSeconds);

    // 物理演算の設定
    if (this.physics !== null) {
      this.physics.evaluate(this.cubismModel, deltaTimeSeconds);
    }

    // リップシンクの設定
    const value = this.soundManager.lipSyncValue;
    for (let i = 0; i < this.lipSyncIds.getSize(); ++i) {
      this.cubismModel.addParameterValueById(
        this.lipSyncIds.at(i),
        value,
        this.lipSyncWeight
      );
    }

    // ポーズの設定
    if (this.pose !== null) {
      this.pose.updateParameters(this.cubismModel, deltaTimeSeconds);
    }

    // モデルの更新
    this.cubismModel.update();
  }

  /**
   * モデルのレンダリング
   * @param gl
   * @param projection
   * @param viewport
   */
  public draw(
    gl: WebGLRenderingContext,
    projection: CubismMatrix44,
    viewport: Viewport
  ): void {
    projection.multiplyByMatrix(this.cubismModelMatrix);
    this.renderer.setMvpMatrix(projection);
    this.renderer.setRenderState(
      gl.getParameter(gl.FRAMEBUFFER_BINDING),
      viewport
    );
    this.renderer.drawModel();
  }

  /**
   * 指定した表情にする
   * @param name
   */
  public setExpression(name: string): void {
    const motion: ACubismMotion | null = this.expressions[name];
    if (motion !== null) {
      this.cubismExpressionManager.startMotionPriority(motion, false, 2);
    } else {
      console.log(`expression[${name}] is null`);
    }
  }

  /**
   * モデルで定義済みの表情からランダムに設定する
   */
  public setRandomExpression(): void {
    const keys = Object.keys(this.expressions);
    const expressionSize = keys.length;
    if (expressionSize === 0) return;

    const no = Math.floor(Math.random() * expressionSize);
    const name = keys[no];
    this.setExpression(name);
  }

  /**
   * 指定したモーショングループからランダムに設定する
   * @param group
   * @param priority
   * @param onFinishedMotionHandler
   */
  public startRandomMotion(
    group: string,
    priority: Priority,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    const motionCount = this.cubismModelSetting.getMotionCount(group);
    if (motionCount === 0) {
      return InvalidMotionQueueEntryHandleValue;
    }
    const no = Math.floor(Math.random() * motionCount);
    return this.startMotion(group, no, priority, onFinishedMotionHandler);
  }

  /**
   * モデルで定義済みのモーショングループからランダムに選択し、その中からランダムに設定する
   * @param priority
   * @param onFinishedMotionHandler
   */
  public startRandomRandomMotion(
    priority: Priority,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    const motionGroupCount = this.cubismModelSetting.getMotionGroupCount();
    const groupNames = [];
    for (let count = 0; count < motionGroupCount; count++) {
      groupNames.push(this.cubismModelSetting.getMotionGroupName(count));
    }
    const group = groupNames[Math.floor(Math.random() * groupNames.length)];
    return this.startRandomMotion(group, priority, onFinishedMotionHandler);
  }

  /**
   * 指定したモーショングループ・番号のモーションにする
   * @param group
   * @param no
   * @param priority
   * @param onFinishedMotionHandler
   */
  public startMotion(
    group: string,
    no: number,
    priority: Priority,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (priority === Priority.Force) {
      this.cubismMotionManager.setReservePriority(priority);
    } else if (!this.cubismMotionManager.reserveMotion(priority)) {
      console.log("can't start motion.");
      return InvalidMotionQueueEntryHandleValue;
    }

    const name = `${group}_${no}`;
    const motion = this.motions[name];
    const autoDelete = false;

    if (motion === null) {
      console.log(`expression[${name}] is null`);
      return;
    }

    if (onFinishedMotionHandler) {
      motion.setFinishedMotionHandler(onFinishedMotionHandler);
    }

    // モーションにサウンドを紐づけられるのでそれを再生
    const motionSoundFileName = this.motionSounds[name];
    if (motionSoundFileName) {
      this.soundManager.playSound(motionSoundFileName);
    }

    return this.cubismMotionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    );
  }
}
