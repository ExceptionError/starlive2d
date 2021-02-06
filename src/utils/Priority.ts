/**
 * 表情やモーションの優先度
 */
export namespace Priority {
  export type Type = typeof None | typeof Idle | typeof Normal | typeof Force;
  export const None = 0;
  export const Idle = 1;
  export const Normal = 2;
  export const Force = 3;
}
