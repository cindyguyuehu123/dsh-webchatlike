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
import type { RegenerateActionProps } from './slots.ts';
/** Props of the edit panel. */
export interface EditDialogProps {
    /** Original prompt text seeded into the editor. */
    initial: string;
    /** Whether a fork/replay is in flight (disables the controls). */
    busy: boolean;
    t: RegenerateActionProps['t'];
    onCancel: () => void;
    onConfirm: (text: string) => void;
}
/**
 * The in-place prompt editor for edit-and-resend.
 * @param props - seed text, busy flag, locale seat, cancel/confirm callbacks.
 */
export declare function EditDialog({ initial, busy, t, onCancel, onConfirm }: EditDialogProps): import("react").JSX.Element;
//# sourceMappingURL=EditDialog.d.ts.map