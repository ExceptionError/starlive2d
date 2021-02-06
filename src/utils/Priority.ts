/**
 * 表情やモーションの優先度
 */
export const Priority = {
  None: 0,
  Idle: 1,
  Normal: 2,
  Force: 3,
} as const;

export type Priority = typeof Priority[keyof typeof Priority];
