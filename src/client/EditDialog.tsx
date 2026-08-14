/**
 * In-place edit-and-resend panel: replaces the user message bubble with an
 * anchored editor (composer-style card) while editing, mirroring the
 * web-chat in-place editing feel — no modal, no full-screen dim.
 *
 * The overlay anchors to the message row: the ui-conversation user-actions
 * patch gives `.userRow` `position: relative`, so this panel can pin itself
 * with `inset: 0` over exactly that row (bubble + icon strip).
 * @module dsh-webchatlike/client/edit-dialog
 */

import { useState } from 'react'
import { Button, IconSendOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { RegenerateActionProps } from './slots.ts'
import css from './styles.module.css'

/** Props of the edit panel. */
export interface EditDialogProps {
  /** Original prompt text seeded into the editor. */
  initial: string
  /** Whether a fork/replay is in flight (disables the controls). */
  busy: boolean
  t: RegenerateActionProps['t']
  onCancel: () => void
  onConfirm: (text: string) => void
}

/**
 * The in-place prompt editor for edit-and-resend.
 * @param props - seed text, busy flag, locale seat, cancel/confirm callbacks.
 */
export function EditDialog({ initial, busy, t, onCancel, onConfirm }: EditDialogProps) {
  const [draft, setDraft] = useState(initial)
  return (
    <div className={css.editPanel} role="group" aria-label={t('edit.title')}>
      <textarea
        className={css.editor}
        value={draft}
        aria-label={t('edit.title')}
        autoFocus
        disabled={busy}
        onChange={(event) => { setDraft(event.target.value) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel()
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            if (draft.trim() !== '' && !busy) onConfirm(draft)
          }
        }}
      />
      <div className={css.editFooter}>
        {busy && <span className={css.status}>{t('regenerate')}…</span>}
        <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>{t('edit.cancel')}</Button>
        <Button
          variant="primary"
          size="sm"
          icon={<IconSendOutline16 />}
          disabled={busy || draft.trim() === ''}
          onClick={() => { onConfirm(draft) }}
        >
          {t('edit.confirm')}
        </Button>
      </div>
    </div>
  )
}
