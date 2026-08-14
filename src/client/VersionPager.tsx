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

import { useEffect, useMemo, useRef } from 'react'
import {
  IconChevronLeftOutline14, IconChevronRightOutline14, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { RegenerateActionProps } from './slots.ts'
import { forkSeqBeforeTurn } from './fork-boundary.ts'
import css from './styles.module.css'

/** localStorage key of the version tree (`{ [atSeq]: { original, versions } }`). */
const VERSION_TREE_KEY = 'dsh-webchatlike:version-tree'

/** localStorage key of the last-viewed-version map (`{ [original]: sessionId }`). */
const LAST_VERSION_KEY = 'dsh-webchatlike:last-version'

/**
 * Record the version session the user last viewed in the conversation of
 * `rootOriginalId` (the ROOT original session — the first session of the
 * conversation, see {@link versionRootOf}; the original itself for version 1,
 * a fork child otherwise). The sidebar restores it when the conversation's
 * row is opened, so visiting another conversation does not throw this one
 * back to the first version. Writes only on change; storage failures degrade
 * to no record.
 */
function recordLastViewedVersion(rootOriginalId: SessionId, viewedId: SessionId): void {
  try {
    const raw = localStorage.getItem(LAST_VERSION_KEY)
    const parsed: Record<string, unknown> = raw === null ? {} : JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return
    const map = parsed as Record<string, SessionId>
    if (map[rootOriginalId] === viewedId) return
    map[rootOriginalId] = viewedId
    localStorage.setItem(LAST_VERSION_KEY, JSON.stringify(map))
  } catch {
    // Storage unavailable (private mode / quota): restore degrades to none.
  }
}

/**
 * ROOT original session of a version fork: forks can themselves be forked
 * (regenerate/edit inside a version), so the chain is walked until the first
 * session of the conversation. Returns the session itself when it is not a
 * recorded fork. Never throws.
 */
function versionRootOf(sessionId: SessionId): SessionId {
  const forkOriginal = new Map<string, string>()
  for (const entry of Object.values(readVersionTree())) {
    for (const version of entry.versions) forkOriginal.set(version, entry.original)
  }
  let cursor: string | undefined = sessionId
  const seen = new Set<string>()
  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor)
    const parent = forkOriginal.get(cursor)
    if (parent === undefined) return (cursor === sessionId ? sessionId : cursor) as SessionId
    cursor = parent
  }
  return sessionId // cycle: malformed tree, degrade to the session itself
}

/** One versioned turn: the original session plus its fork children. */
export interface VersionTree {
  /** The session that first contained this turn (forked FROM first). */
  original: SessionId
  /** Fork children in creation order (regenerate/edit results). */
  versions: SessionId[]
  /** Fork creation times, keyed by child id (stable version order). */
  times: Record<string, number>
}

/** One session row of the live session list (host summary passthrough). */
interface SessionRow {
  parentId?: SessionId
  seedLength?: number
  updatedAt: number
}

/**
 * Read the version tree. Corrupt/missing entries degrade to empty; legacy
 * flat ledgers (v1 `childId: parentId`, v2 `childId: {parentId,atSeq,time}`)
 * are rebuilt into the tree shape on read.
 */
export function readVersionTree(): Record<string, VersionTree> {
  try {
    const raw = localStorage.getItem(VERSION_TREE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    // v3: { [atSeq]: { original, versions, times } }
    const tree: Record<string, VersionTree> = {}
    for (const [atSeqKey, value] of Object.entries(parsed)) {
      if (typeof value !== 'object' || value === null) continue
      const t = value as Partial<VersionTree>
      if (typeof t.original === 'string' && Array.isArray(t.versions)) {
        tree[atSeqKey] = {
          original: t.original as SessionId,
          versions: t.versions.filter((v): v is SessionId => typeof v === 'string'),
          times: typeof t.times === 'object' && t.times !== null ? t.times : {},
        }
      }
    }
    if (Object.keys(tree).length > 0) return tree
    // Legacy flat ledger: group by atSeq, original = parent of the earliest fork.
    const flat = parsed as Record<string, unknown>
    const byTurn = new Map<string, { parentId: SessionId; childId: SessionId; time: number }[]>()
    for (const [childId, value] of Object.entries(flat)) {
      let parentId: SessionId | undefined
      let atSeq: number | undefined
      let time = 0
      if (typeof value === 'string') {
        parentId = value as SessionId
        atSeq = -1
      } else if (typeof value === 'object' && value !== null) {
        const e = value as { parentId?: unknown; atSeq?: unknown; time?: unknown }
        if (typeof e.parentId === 'string' && typeof e.atSeq === 'number') {
          parentId = e.parentId as SessionId
          atSeq = e.atSeq
          if (typeof e.time === 'number') time = e.time
        }
      }
      if (parentId === undefined || atSeq === undefined || atSeq < 0) continue
      const list = byTurn.get(String(atSeq)) ?? []
      list.push({ parentId, childId: childId as SessionId, time })
      byTurn.set(String(atSeq), list)
    }
    for (const [atSeqKey, list] of byTurn) {
      list.sort((a, b) => (a.time - b.time) || (a.childId < b.childId ? -1 : 1))
      const original = list[0]?.parentId
      if (original === undefined) continue
      tree[atSeqKey] = {
        original,
        versions: list.map(entry => entry.childId),
        times: Object.fromEntries(list.map(entry => [entry.childId, entry.time])),
      }
    }
    return tree
  } catch {
    return {}
  }
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
export function recordVersionFork(childId: SessionId, parentId: SessionId, atSeq: number): void {
  try {
    const tree = readVersionTree()
    const key = String(atSeq)
    const turn = tree[key] ?? { original: parentId, versions: [], times: {} }
    if (!turn.versions.includes(childId)) {
      turn.versions.push(childId)
      turn.times[childId] = Date.now()
    }
    tree[key] = turn
    localStorage.setItem(VERSION_TREE_KEY, JSON.stringify(tree))
  } catch {
    // Storage unavailable (private mode / quota): versions degrade to none.
  }
}

/**
 * The version family of the logical turn anchored at `atSeq`: the original
 * session plus every recorded fork of this exact turn, oldest first.
 * `undefined` when the turn has no versions.
 * @param byId - the live session list rows keyed by id.
 * @param atSeq - the fork boundary fingerprint of the turn.
 * @returns the ordered family ids, or undefined when there is none.
 */
export function versionFamilyOf(
  byId: Readonly<Record<SessionId, SessionRow>>,
  atSeq: number,
): SessionId[] | undefined {
  const tree = readVersionTree()
  const turn = tree[String(atSeq)]
  if (turn === undefined) return undefined
  const members: SessionId[] = [turn.original, ...turn.versions]
  const live = members.filter(id => byId[id] !== undefined)
  if (live.length <= 1) return undefined
  // Stable order: original first, then forks by creation time (tie: id).
  const ordered = [turn.original, ...turn.versions]
    .filter(id => byId[id] !== undefined)
    .sort((a, b) => {
      if (a === turn.original) return -1
      if (b === turn.original) return 1
      const ta = turn.times[a] ?? 0
      const tb = turn.times[b] ?? 0
      return (ta - tb) || (a < b ? -1 : a > b ? 1 : 0)
    })
  return ordered
}

/**
 * Locate `sessionId` within `family`. A session that merely inherited the
 * versioned turn (a later fork of ANOTHER turn) is not a member; walk its
 * host parent chain to the nearest member and report that member's position.
 * @param family - the ordered family ids.
 * @param sessionId - the session the pager is rendered in.
 * @param byId - the live session list rows keyed by id (host parent chain).
 * @returns the member index, or -1 when no ancestor is in the family.
 */
export function familyIndexOf(
  family: readonly SessionId[],
  sessionId: SessionId,
  byId: Readonly<Record<SessionId, SessionRow>>,
): number {
  const direct = family.indexOf(sessionId)
  if (direct >= 0) return direct
  const seen = new Set<SessionId>()
  let cursor: SessionId | undefined = sessionId
  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor)
    const index = family.indexOf(cursor)
    if (index >= 0) return index
    cursor = byId[cursor]?.parentId
  }
  return -1
}

/** One pending scroll-target request after a version switch. */
let pendingFocus: { sessionId: SessionId; atSeq: number } | null = null

/**
 * Request that the pager for `atSeq` inside `sessionId` scroll into view the
 * next time it renders (called right before `sessions.open`).
 */
export function requestVersionFocus(sessionId: SessionId, atSeq: number): void {
  pendingFocus = { sessionId, atSeq }
}

/**
 * Version pager entry: `<i/N>` + chevrons on the assistant strip, rendered
 * on EVERY message whose turn has recorded versions. Switching opens the
 * sibling fork and scrolls the same turn into view.
 * @param props - the owner's message identity, the session kit, the injected
 * navigation verb, and the copy.
 */
export function VersionPager({
  messageId, useSession, useSessions, sessionId, openSession, t,
}: RegenerateActionProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null)
  // The turn fingerprint of THIS message: undefined for the first turn (no
  // clean cut point, no versions possible) or for non-finalized messages.
  const atSeq = useSession(snapshot => {
    for (const key of snapshot.chat.order) {
      const node = snapshot.chat.nodes.get(key)
      if (node === undefined) continue
      const data = node.data as { finalNode?: { messageId?: string } | undefined }
      if (data.finalNode?.messageId !== messageId) continue
      const turn = node.location.kind === 'turn' || node.location.kind === 'step'
        ? node.location.turn?.turn
        : undefined
      if (turn === undefined) return undefined
      return forkSeqBeforeTurn(snapshot, turn)
    }
    return undefined
  })
  const byId = useSessions(state => state.byId)
  const family = useMemo(() => {
    if (atSeq === undefined) return undefined
    return versionFamilyOf(byId, atSeq)
  }, [byId, atSeq])
  // After a version switch, scroll this turn into view in the freshly opened
  // session (the pager for the same atSeq is the marker of that turn).
  useEffect(() => {
    if (pendingFocus === null || pendingFocus.sessionId !== sessionId || pendingFocus.atSeq !== atSeq) return
    pendingFocus = null
    hostRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [sessionId, atSeq, family])
  if (family === undefined || sessionId === undefined) return null
  // A session that merely inherited the versioned turn (a later fork of
  // another turn) positions the pager via its nearest family ancestor.
  const index = familyIndexOf(family, sessionId, byId)
  if (index < 0) return null
  const count = family.length
  // The conversation's ROOT original (a fork's `original` can itself be a
  // fork when a version was regenerated/edited again): the sidebar keys
  // highlight, restore, and recency on this root row.
  const rootOriginal = versionRootOf(sessionId)
  // Remember where the user left this conversation (the pager renders on
  // every versioned message of the session being viewed, so any visit — page
  // switch or direct fork open — updates the record). The sidebar restores
  // this when the conversation's row is opened.
  useEffect(() => {
    recordLastViewedVersion(rootOriginal, sessionId)
  }, [rootOriginal, sessionId, index])
  const prev = index > 0 ? family[index - 1] : undefined
  const next = index < count - 1 ? family[index + 1] : undefined
  const switchTo = (target: SessionId | undefined): void => {
    if (target === undefined || atSeq === undefined) return
    recordLastViewedVersion(rootOriginal, target)
    requestVersionFocus(target, atSeq)
    openSession(target)
  }
  return (
    <span className={css.pager} ref={hostRef}>
      <Tooltip label={t('version.previous')} side="bottom">
        <button
          type="button"
          className={css.pagerButton}
          aria-label={t('version.previous')}
          disabled={prev === undefined}
          onClick={() => { switchTo(prev) }}
        >
          <IconChevronLeftOutline14 />
        </button>
      </Tooltip>
      <span className={css.pagerLabel} aria-live="polite">
        {index + 1}/{count}
      </span>
      <Tooltip label={t('version.next')} side="bottom">
        <button
          type="button"
          className={css.pagerButton}
          aria-label={t('version.next')}
          disabled={next === undefined}
          onClick={() => { switchTo(next) }}
        >
          <IconChevronRightOutline14 />
        </button>
      </Tooltip>
    </span>
  )
}
