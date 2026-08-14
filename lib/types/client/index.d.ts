/**
 * dsh-webchatlike: web-chat-like message actions for the Harness web GUI.
 *
 * Regenerate lives on the assistant-message action strip
 * (conversation.chat.assistant-actions); edit-and-resend lives on the
 * user-message action strip (conversation.chat.user-actions, contributed by
 * the ui-conversation user-actions slot patch). Both fork the session
 * *before* the target turn — so the inherited history carries no duplicate
 * prompt — open the child, and queue the (edited) prompt through the
 * session's public `prompt` face.
 *
 * @module dsh-webchatlike/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export type { ChatActionsInjected, EditActionProps, RegenerateActionProps } from './slots.ts';
export type { ChatActionsKey } from './locales.ts';
export { readVersionTree, recordVersionFork, versionFamilyOf } from './VersionPager.tsx';
/** Required services: the slot registry, the session navigator, and the copy. */
export declare const inject: string[];
/**
 * Client plugin body: regenerate on the assistant strip, edit-and-resend on
 * the user strip, and a version pager that flips between the sibling forks
 * of the same turn (web-chat style).
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map