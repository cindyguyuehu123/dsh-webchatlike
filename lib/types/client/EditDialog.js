import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useState } from 'react';
import { Button, IconSendOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './styles.module.css';
/**
 * The in-place prompt editor for edit-and-resend.
 * @param props - seed text, busy flag, locale seat, cancel/confirm callbacks.
 */
export function EditDialog({ initial, busy, t, onCancel, onConfirm }) {
    const [draft, setDraft] = useState(initial);
    return (_jsxs("div", { className: css.editPanel, role: "group", "aria-label": t('edit.title'), children: [_jsx("textarea", { className: css.editor, value: draft, "aria-label": t('edit.title'), autoFocus: true, disabled: busy, onChange: (event) => { setDraft(event.target.value); }, onKeyDown: (event) => {
                    if (event.key === 'Escape' && !busy)
                        onCancel();
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        if (draft.trim() !== '' && !busy)
                            onConfirm(draft);
                    }
                } }), _jsxs("div", { className: css.editFooter, children: [busy && _jsxs("span", { className: css.status, children: [t('regenerate'), "\u2026"] }), _jsx(Button, { variant: "outline", size: "sm", disabled: busy, onClick: onCancel, children: t('edit.cancel') }), _jsx(Button, { variant: "primary", size: "sm", icon: _jsx(IconSendOutline16, {}), disabled: busy || draft.trim() === '', onClick: () => { onConfirm(draft); }, children: t('edit.confirm') })] })] }));
}
//# sourceMappingURL=EditDialog.js.map