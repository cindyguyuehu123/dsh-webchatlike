/**
 * `chat-actions` namespace dictionaries.
 * @module dsh-chat-actions/client/locales
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'regenerate': '重新生成回复',
  'edit': '编辑并重新发送',
  'edit.title': '编辑并重新发送',
  'edit.confirm': '重新发送',
  'edit.cancel': '取消',
  'regenerate.unavailable': '该消息无法重新生成（仅首个回合后的已完成回复可用）',
  'edit.unavailable': '该消息无法编辑（仅首个回合后的消息可用）',
  'version.previous': '上一个版本',
  'version.next': '下一个版本',
} satisfies Record<string, string>

/** The chat-actions namespace key union. */
export type ChatActionsKey = keyof typeof zh

/** English dictionary (keys must match `zh` exactly). */
export const en = {
  'regenerate': 'Regenerate response',
  'edit': 'Edit and resend',
  'edit.title': 'Edit and resend',
  'edit.confirm': 'Resend',
  'edit.cancel': 'Cancel',
  'regenerate.unavailable': 'Cannot regenerate this message (only completed replies after the first turn)',
  'edit.unavailable': 'Cannot edit this message (only messages after the first turn)',
  'version.previous': 'Previous version',
  'version.next': 'Next version',
} satisfies Record<ChatActionsKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The chat-actions strip's copy. */
    'chat-actions': ChatActionsKey
  }
}
