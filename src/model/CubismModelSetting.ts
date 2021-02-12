import { ICubismModelSetting } from '@cubism/icubismmodelsetting';
import { CubismId } from '@cubism/id/cubismid';
import { CubismFramework } from '@cubism/live2dcubismframework';
import { csmMap } from '@cubism/type/csmmap';

export class CubismModelSetting extends ICubismModelSetting {
  public constructor(private json: CubismSpec.ModelJSON) {
    super();
  }

  public getModelFileName(): string {
    return this.json.FileReferences.Moc;
  }

  public getTextureCount(): number {
    return this.json.FileReferences.Textures.length;
  }

  public getTextureDirectory(): string {
    // 利用されていない
    throw new Error('Method not implemented.');
  }

  public getTextureFileName(index: number): string {
    return this.json.FileReferences.Textures[index];
  }

  public getHitAreasCount(): number {
    return this.json.HitAreas?.length ?? 0;
  }

  public getHitAreaId(index: number): CubismId {
    const value = this.json.HitAreas[index].Id;
    return CubismFramework.getIdManager().getId(value);
  }

  public getHitAreaName(index: number): string {
    return this.json.HitAreas[index].Name;
  }

  public getPhysicsFileName(): string {
    return this.json.FileReferences.Physics ?? '';
  }

  public getPoseFileName(): string {
    return this.json.FileReferences.Pose ?? '';
  }

  public getExpressionCount(): number {
    return this.json.FileReferences.Expressions?.length ?? 0;
  }

  public getExpressionName(index: number): string {
    const exp = this.json.FileReferences.Expressions[index];
    return exp.Name;
  }

  public getExpressionFileName(index: number): string {
    const exp = this.json.FileReferences.Expressions[index];
    return exp.File;
  }

  public getMotionGroupCount(): number {
    return Object.entries(this.json.FileReferences.Motions ?? {}).length;
  }

  public getMotionGroupName(index: number): string {
    const keys = Object.keys(this.json.FileReferences.Motions);
    return keys[index];
  }

  public getMotionCount(groupName: string): number {
    return this.json.FileReferences.Motions[groupName].length;
  }

  public getMotionFileName(groupName: string, index: number): string {
    const mtn = this.json.FileReferences.Motions[groupName][index];
    return mtn.File;
  }

  public getMotionSoundFileName(groupName: string, index: number): string {
    const mtn = this.json.FileReferences.Motions[groupName][index];
    return mtn.Sound ?? '';
  }

  public getMotionFadeInTimeValue(groupName: string, index: number): number {
    const mtn = this.json.FileReferences.Motions[groupName][index];
    return mtn.FadeInTime ?? -1.0;
  }

  public getMotionFadeOutTimeValue(groupName: string, index: number): number {
    const mtn = this.json.FileReferences.Motions[groupName][index];
    return mtn.FadeOutTime ?? -1.0;
  }

  public getUserDataFile(): string {
    return this.json.FileReferences.UserData ?? '';
  }

  public getLayoutMap(outLayoutMap: csmMap<string, number>): boolean {
    const layout = this.json.Layout;
    if (!layout) {
      return false;
    }
    const entries = Object.entries(layout);
    if (entries.length === 0) {
      return false;
    }
    Object.entries(layout).forEach((entry) => {
      outLayoutMap.setValue(entry[0], entry[1]);
    });
    return true;
  }

  public getEyeBlinkParameterCount(): number {
    const group = this.getGroupParameter('EyeBlink');
    return group?.Ids.length ?? 0;
  }

  public getEyeBlinkParameterId(index: number): CubismId {
    const group = this.getGroupParameter('EyeBlink');
    const id = group?.Ids[index];
    if (id) {
      return CubismFramework.getIdManager().getId(id);
    } else {
      return null;
    }
  }

  public getLipSyncParameterCount(): number {
    const group = this.getGroupParameter('LipSync');
    return group?.Ids.length ?? 0;
  }

  public getLipSyncParameterId(index: number): CubismId {
    const group = this.getGroupParameter('LipSync');
    const id = group?.Ids[index];
    if (id) {
      return CubismFramework.getIdManager().getId(id);
    } else {
      return null;
    }
  }

  private getGroupParameter(name: string): CubismSpec.Group | null {
    return this.json.Groups?.find((g) => g.Name === name);
  }
}
