/**
 * `chat-actions` namespace dictionaries.
 * @module dsh-chat-actions/client/locales
 */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    regenerate: string;
    edit: string;
    'edit.title': string;
    'edit.confirm': string;
    'edit.cancel': string;
    'regenerate.unavailable': string;
    'edit.unavailable': string;
    'version.previous': string;
    'version.next': string;
};
/** The chat-actions namespace key union. */
export type ChatActionsKey = keyof typeof zh;
/** English dictionary (keys must match `zh` exactly). */
export declare const en: {
    regenerate: string;
    edit: string;
    'edit.title': string;
    'edit.confirm': string;
    'edit.cancel': string;
    'regenerate.unavailable': string;
    'edit.unavailable': string;
    'version.previous': string;
    'version.next': string;
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The chat-actions strip's copy. */
        'chat-actions': ChatActionsKey;
    }
}
//# sourceMappingURL=locales.d.ts.map