/**
 * Fork-boundary + turn-prompt helpers for regenerate / edit-and-resend.
 *
 * The host fork RPC anchors a cut to the completed turn ending at (or after)
 * `atSeq` — the fork *includes* the whole turn that contains `atSeq`. To
 * restart from a turn's beginning (so the replayed prompt does not duplicate
 * the turn already in the inherited history), the fork point must be the
 * *previous* turn's `turn/end` seq.
 */
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** Plain-text user prompt of one turn ('' for steering-only turns). */
export function userPromptOfTurn(
  snapshot: ConversationSnapshot,
  turn: number,
): string {
  for (const key of snapshot.chat.locations.getTurn(turn)) {
    const n = snapshot.chat.nodes.get(key)
    if (n?.kind === 'user') {
      const content = (n.data as { content?: readonly { type?: string; text?: string }[] }).content ?? []
      return content
        .filter(block => block.type === 'text' && typeof block.text === 'string')
        .map(block => (block as { text: string }).text)
        .join('')
    }
  }
  return ''
}

/**
 * The fork `atSeq` that excludes `turn` from the new session: the previous
 * completed turn's `turn/end` seq. `undefined` for the first turn (no clean
 * cut point — the action should be unavailable then).
 */
export function forkSeqBeforeTurn(
  snapshot: ConversationSnapshot,
  turn: number,
): number | undefined {
  const { turnOrder, turns } = snapshot.chat.timeline
  const index = turnOrder.indexOf(turn)
  if (index <= 0) return undefined
  const previousKey = turnOrder[index - 1]
  if (previousKey === undefined) return undefined
  const previous = turns.get(previousKey)
  const end = previous?.end
  return end?.seq
}
