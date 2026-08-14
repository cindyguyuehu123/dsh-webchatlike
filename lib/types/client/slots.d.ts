/**
 * Injected face and full props of the chat-actions entry on the assistant
 * message strip. The target 'conversation.chat.assistant-actions' slot is
 * declared and typed by ui-conversation; this package only contributes an
 * entry, so no SlotMap merge lives here.
 * @module dsh-chat-actions/client/slots
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
/** Injected business face of one assistant-message chat-actions entry. */
export interface ChatActionsInjected {
    /**
     * Fork the owning session at `forkSeq` (a boundary before the target turn),
     * open the child, and queue `text` as a fresh prompt. Regenerate passes the
     * original prompt; edit-and-resend passes the edited one.
     */
    forkAndReplay: (forkSeq: number, text: string) => Promise<void>;
    /** Open another session (used by the version pager to flip between forks). */
    openSession: (sessionId: SessionId) => void;
}
/** Full props of the regenerate entry (assistant-message strip). */
export type RegenerateActionProps = PropsRuntime<'conversation.chat.assistant-actions'> & InjectFace<ChatActionsInjected> & PropsLocale<'chat-actions'>;
/** Full props of the edit-and-resend entry (user-message strip). */
export type EditActionProps = PropsRuntime<'conversation.chat.user-actions'> & InjectFace<ChatActionsInjected> & PropsLocale<'chat-actions'>;
//# sourceMappingURL=slots.d.ts.map