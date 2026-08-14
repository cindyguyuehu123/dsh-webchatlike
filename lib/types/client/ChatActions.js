import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The chat-actions entries: regenerate (assistant strip) and edit-and-resend
 * (user strip), plus the edit-and-resend dialog.
 *
 * Both actions fork the session before the target turn via the injected
 * `forkAndReplay` verb: the inherited history carries no duplicate prompt,
 * and the (edited) prompt is queued into the fresh child session.
 * @module dsh-chat-actions/client/actions
 */
import { useState } from 'react';
import { IconEditOutline16, IconRefreshOutline16, Tooltip, } from '@deepseek-ai/dsh-client-ui-primitives';
import { forkSeqBeforeTurn, userPromptOfTurn } from "./fork-boundary.js";
import { EditDialog } from "./EditDialog.js";
import css from './styles.module.css';
/**
 * Resolve fork point + prompt for the turn holding `node`. `undefined` when
 * the turn is not cleanly cuttable (first turn) or has no text to replay.
 */
function targetOfTurn(snapshot, node) {
    const turn = node.location.kind === 'turn' || node.location.kind === 'step'
        ? node.location.turn?.turn
        : undefined;
    if (turn === undefined)
        return undefined;
    const forkSeq = forkSeqBeforeTurn(snapshot, turn);
    if (forkSeq === undefined)
        return undefined;
    const prompt = userPromptOfTurn(snapshot, turn);
    return prompt === '' ? undefined : { forkSeq, prompt };
}
/** Shared inline icon-button chrome. */
function IconButton({ label, busy, onClick, children }) {
    return (_jsx(Tooltip, { label: label, side: "top", children: _jsx("button", { type: "button", className: css.action, "aria-label": label, disabled: busy, onClick: onClick, children: children }) }));
}
/**
 * Regenerate entry for one finalized assistant message (assistant strip).
 * @param props - the owner\'s message identity, session kit, injected verb, and copy.
 */
export function RegenerateActions({ messageId, useSession, forkAndReplay, t }) {
    const target = useSession(snapshot => {
        for (const key of snapshot.chat.order) {
            const n = snapshot.chat.nodes.get(key);
            if (n === undefined)
                continue;
            const data = n.data;
            if (data.finalNode?.messageId !== messageId)
                continue;
            return targetOfTurn(snapshot, n);
        }
        return undefined;
    });
    const [busy, setBusy] = useState(false);
    if (target === undefined)
        return null;
    return (_jsx("span", { className: css.actions, children: _jsx(IconButton, { label: t('regenerate'), busy: busy, onClick: () => {
                setBusy(true);
                void forkAndReplay(target.forkSeq, target.prompt).finally(() => setBusy(false));
            }, children: _jsx(IconRefreshOutline16, {}) }) }));
}
/**
 * Edit-and-resend entry for one finalized user message (user strip).
 * @param props - the owner\'s message seq, session kit, injected verb, and copy.
 */
export function EditAction({ messageSeq, useSession, forkAndReplay, t }) {
    const target = useSession(snapshot => {
        for (const key of snapshot.chat.order) {
            const n = snapshot.chat.nodes.get(key);
            if (n === undefined || n.kind !== 'user')
                continue;
            const data = n.data;
            if (data.seq !== messageSeq)
                continue;
            return targetOfTurn(snapshot, n);
        }
        return undefined;
    });
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    if (target === undefined)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("span", { className: css.actions, children: _jsx(IconButton, { label: t('edit'), busy: busy, onClick: () => { setEditing(true); }, children: _jsx(IconEditOutline16, {}) }) }), editing && (_jsx(EditDialog, { initial: target.prompt, busy: busy, t: t, onCancel: () => { setEditing(false); }, onConfirm: (text) => {
                    setBusy(true);
                    void forkAndReplay(target.forkSeq, text)
                        .finally(() => { setBusy(false); setEditing(false); });
                } }))] }));
}
//# sourceMappingURL=ChatActions.js.map