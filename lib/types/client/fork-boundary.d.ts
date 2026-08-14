/**
 * Fork-boundary + turn-prompt helpers for regenerate / edit-and-resend.
 *
 * The host fork RPC anchors a cut to the completed turn ending at (or after)
 * `atSeq` — the fork *includes* the whole turn that contains `atSeq`. To
 * restart from a turn's beginning (so the replayed prompt does not duplicate
 * the turn already in the inherited history), the fork point must be the
 * *previous* turn's `turn/end` seq.
 */
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
/** Plain-text user prompt of one turn ('' for steering-only turns). */
export declare function userPromptOfTurn(snapshot: ConversationSnapshot, turn: number): string;
/**
 * The fork `atSeq` that excludes `turn` from the new session: the previous
 * completed turn's `turn/end` seq. `undefined` for the first turn (no clean
 * cut point — the action should be unavailable then).
 */
export declare function forkSeqBeforeTurn(snapshot: ConversationSnapshot, turn: number): number | undefined;
//# sourceMappingURL=fork-boundary.d.ts.map