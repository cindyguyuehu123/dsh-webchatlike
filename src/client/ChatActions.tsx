/**
 * The chat-actions entries: regenerate (assistant strip) and edit-and-resend
 * (user strip), plus the edit-and-resend dialog.
 *
 * Both actions fork the session before the target turn via the injected
 * `forkAndReplay` verb: the inherited history carries no duplicate prompt,
 * and the (edited) prompt is queued into the fresh child session.
 * @module dsh-chat-actions/client/actions
 */

import { useState } from 'react'
import {
  IconEditOutline16, IconRefreshOutline16, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { EditActionProps, RegenerateActionProps } from './slots.ts'
import { forkSeqBeforeTurn, userPromptOfTurn } from './fork-boundary.ts'
import { EditDialog } from './EditDialog.tsx'
import css from './styles.module.css'

/** The target-turn facts resolved from a message identity. */
interface RegenerateTarget {
  readonly forkSeq: number
  readonly prompt: string
}

/**
 * Resolve fork point + prompt for the turn holding `node`. `undefined` when
 * the turn is not cleanly cuttable (first turn) or has no text to replay.
 */
function targetOfTurn(
  snapshot: ConversationSnapshot,
  node: { location: { kind: string; turn?: { turn?: number } } },
): RegenerateTarget | undefined {
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn?.turn
    : undefined
  if (turn === undefined) return undefined
  const forkSeq = forkSeqBeforeTurn(snapshot, turn)
  if (forkSeq === undefined) return undefined
  const prompt = userPromptOfTurn(snapshot, turn)
  return prompt === '' ? undefined : { forkSeq, prompt }
}

/** Shared inline icon-button chrome. */
function IconButton({ label, busy, onClick, children }: {
  label: string
  busy: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip label={label} side="top">
      <button
        type="button"
        className={css.action}
        aria-label={label}
        disabled={busy}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  )
}

/**
 * Regenerate entry for one finalized assistant message (assistant strip).
 * @param props - the owner\'s message identity, session kit, injected verb, and copy.
 */
export function RegenerateActions({ messageId, useSession, forkAndReplay, t }: RegenerateActionProps) {
  const target = useSession(snapshot => {
    for (const key of snapshot.chat.order) {
      const n = snapshot.chat.nodes.get(key)
      if (n === undefined) continue
      const data = n.data as { finalNode?: { messageId?: string } | undefined }
      if (data.finalNode?.messageId !== messageId) continue
      return targetOfTurn(snapshot, n)
    }
    return undefined
  })
  const [busy, setBusy] = useState(false)
  if (target === undefined) return null
  return (
    <span className={css.actions}>
      <IconButton
        label={t('regenerate')}
        busy={busy}
        onClick={() => {
          setBusy(true)
          void forkAndReplay(target.forkSeq, target.prompt).finally(() => setBusy(false))
        }}
      >
        <IconRefreshOutline16 />
      </IconButton>
    </span>
  )
}

/**
 * Edit-and-resend entry for one finalized user message (user strip).
 * @param props - the owner\'s message seq, session kit, injected verb, and copy.
 */
export function EditAction({ messageSeq, useSession, forkAndReplay, t }: EditActionProps) {
  const target = useSession(snapshot => {
    for (const key of snapshot.chat.order) {
      const n = snapshot.chat.nodes.get(key)
      if (n === undefined || n.kind !== 'user') continue
      const data = n.data as { seq?: number }
      if (data.seq !== messageSeq) continue
      return targetOfTurn(snapshot, n)
    }
    return undefined
  })
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  if (target === undefined) return null
  return (
    <>
      <span className={css.actions}>
        <IconButton
          label={t('edit')}
          busy={busy}
          onClick={() => { setEditing(true) }}
        >
          <IconEditOutline16 />
        </IconButton>
      </span>
      {editing && (
        <EditDialog
          initial={target.prompt}
          busy={busy}
          t={t}
          onCancel={() => { setEditing(false) }}
          onConfirm={(text) => {
            setBusy(true)
            void forkAndReplay(target.forkSeq, text)
              .finally(() => { setBusy(false); setEditing(false) })
          }}
        />
      )}
    </>
  )
}
