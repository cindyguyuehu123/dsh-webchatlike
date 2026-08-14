/**
 * The chat-actions entries: regenerate (assistant strip) and edit-and-resend
 * (user strip), plus the edit-and-resend dialog.
 *
 * Both actions fork the session before the target turn via the injected
 * `forkAndReplay` verb: the inherited history carries no duplicate prompt,
 * and the (edited) prompt is queued into the fresh child session.
 * @module dsh-chat-actions/client/actions
 */
import type { EditActionProps, RegenerateActionProps } from './slots.ts';
/**
 * Regenerate entry for one finalized assistant message (assistant strip).
 * @param props - the owner\'s message identity, session kit, injected verb, and copy.
 */
export declare function RegenerateActions({ messageId, useSession, forkAndReplay, t }: RegenerateActionProps): import("react").JSX.Element | null;
/**
 * Edit-and-resend entry for one finalized user message (user strip).
 * @param props - the owner\'s message seq, session kit, injected verb, and copy.
 */
export declare function EditAction({ messageSeq, useSession, forkAndReplay, t }: EditActionProps): import("react").JSX.Element | null;
//# sourceMappingURL=ChatActions.d.ts.map