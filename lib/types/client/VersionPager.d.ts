/**
 * Version pager for the assistant strip: `<i/N>` with left/right chevrons to
 * flip between the versions of ONE logical turn (web-chat style, deepseek.com
 * tree model). Every message whose turn was regenerated/edited shows a pager;
 * switching opens the sibling fork and scrolls that turn into view.
 *
 * Version tracking is a TREE, keyed by the logical turn. The turn's
 * fingerprint is `atSeq` — the fork boundary (the previous turn's turn/end
 * seq), which stays identical across every fork of the same turn because
 * forks inherit the log up to that point. The ledger stores, per turn:
 *
 *   { original: SessionId, versions: SessionId[] }
 *
 * `original` is the session that first contained the turn (the one that was
 * forked FROM on the first regenerate/edit — no inference needed), and
 * `versions` are the fork children in creation order. A family lookup is a
 * plain table read: original first, then versions. No BFS, no seedLength
 * arithmetic, no guessing — the tree IS the record.
 * @module dsh-webchatlike/client/version-pager
 */
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { RegenerateActionProps } from './slots.ts';
/**
 * ROOT original session of a version fork: forks can themselves be forked
 * (regenerate/edit inside a version), so the chain is walked until the first
 * session of the conversation. Returns the session itself when it is not a
 * recorded fork. Never throws.
 */
export declare function versionRootOf(sessionId: SessionId): SessionId;
/** One versioned turn: the original session plus its fork children. */
export interface VersionTree {
    /** The session that first contained this turn (forked FROM first). */
    original: SessionId;
    /** Fork children in creation order (regenerate/edit results). */
    versions: SessionId[];
    /** Fork creation times, keyed by child id (stable version order). */
    times: Record<string, number>;
}
/** One session row of the live session list (host summary passthrough). */
interface SessionRow {
    parentId?: SessionId;
    seedLength?: number;
    updatedAt: number;
}
/**
 * Record one version fork (regenerate / edit-and-resend child). Written
 * synchronously right after `session.fork` succeeds, so the child session is
 * immediately addressable as a version even before the host list refreshes.
 * The FIRST fork of a turn fixes `original` = the forked-from session; later
 * forks append to `versions`.
 * @param childId - the forked session.
 * @param parentId - the session it forked from.
 * @param atSeq - the fork boundary (the logical turn being versioned).
 */
export declare function recordVersionFork(childId: SessionId, parentId: SessionId, atSeq: number): void;
/**
 * The version family of the logical turn anchored at `atSeq`: the original
 * session plus every recorded fork of this exact turn, oldest first.
 * `undefined` when the turn has no versions.
 * @param byId - the live session list rows keyed by id.
 * @param atSeq - the fork boundary fingerprint of the turn.
 * @returns the ordered family ids, or undefined when there is none.
 */
export declare function versionFamilyOf(byId: Readonly<Record<SessionId, SessionRow>>, atSeq: number, rootId: SessionId): SessionId[] | undefined;
/**
 * Locate `sessionId` within `family`. A session that merely inherited the
 * versioned turn (a later fork of ANOTHER turn) is not a member; walk its
 * host parent chain to the nearest member and report that member's position.
 * @param family - the ordered family ids.
 * @param sessionId - the session the pager is rendered in.
 * @param byId - the live session list rows keyed by id (host parent chain).
 * @returns the member index, or -1 when no ancestor is in the family.
 */
export declare function familyIndexOf(family: readonly SessionId[], sessionId: SessionId, byId: Readonly<Record<SessionId, SessionRow>>): number;
/**
 * Request that the pager for `atSeq` inside `sessionId` scroll into view the
 * next time it renders (called right before `sessions.open`).
 */
export declare function requestVersionFocus(sessionId: SessionId, atSeq: number): void;
/**
 * Version pager entry: `<i/N>` + chevrons on the assistant strip, rendered
 * on EVERY message whose turn has recorded versions. Switching opens the
 * sibling fork and scrolls the same turn into view.
 * @param props - the owner's message identity, the session kit, the injected
 * navigation verb, and the copy.
 */
export declare function VersionPager({ messageId, useSession, useSessions, sessionId, openSession, t, }: RegenerateActionProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=VersionPager.d.ts.map