/**
 * Derives the workspace browser tree from Host Workspace order and membership.
 * Unassigned Sessions trail under Ungrouped; only the selected blank Session
 * remains visible.
 */
import {
  indexSubagentDescendants, type PendingInteractionStatus, type SessionId, type SessionListState,
  type SessionSearchResultItem, type SessionSummary, type SubagentDescendantSummary,
  type WorkspaceId, type WorkspaceView,
} from '@deepseek-ai/dsh-client-runtime/client'

/**
 * localStorage key of the dsh-webchatlike version tree
 * (`{ [atSeq]: { original, versions, times } }`). `versions` members are
 * version forks (regenerate / edit-and-resend children) and are hidden from
 * the sidebar; the `original` session stays visible. Cross-plugin convention
 * with dsh-webchatlike; reads are fully defensive — a missing, stale, or
 * malformed tree must never take the sidebar down.
 */
const VERSION_TREE_KEY = 'dsh-webchatlike:version-tree'

/** Parsed version-tree turns (`{ original, versions }`), defensive: empty when missing/unreadable. */
function versionTreeEntries(): { original: string; versions: string[] }[] {
  let raw: string | null = null
  try {
    raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(VERSION_TREE_KEY)
  } catch {
    return []
  }
  if (raw === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return []
  const entries: { original: string; versions: string[] }[] = []
  for (const value of Object.values(parsed as Record<string, unknown>)) {
    const entry = value as { original?: unknown; versions?: unknown } | null
    if (entry === null || typeof entry !== 'object') continue
    if (typeof entry.original !== 'string' || !Array.isArray(entry.versions)) continue
    entries.push({
      original: entry.original,
      versions: (entry.versions as unknown[]).filter((v): v is string => typeof v === 'string' && v !== ''),
    })
  }
  return entries
}

/**
 * Session ids hidden from the sidebar as version-family members: the version
 * forks recorded in the version tree (regenerate/edit children). Forks
 * created by the sidebar's own fork action are NOT recorded there and stay
 * visible as ordinary rows — matching the stock fork behavior. Family members
 * are ALWAYS hidden — the currently open one included — so a conversation
 * shows exactly one sidebar row (its root original); the open member is
 * presented through its root row via {@link versionAliasedCurrent}.
 * Archived/blank/subagent rules still apply on top. Returns an empty set when
 * the tree is missing or unreadable, never throws.
 */
export function hiddenVersionSessionIds(): ReadonlySet<string> {
  const hidden = new Set<string>()
  for (const entry of versionTreeEntries()) {
    for (const id of entry.versions) hidden.add(id)
  }
  return hidden
}

/**
 * The session the sidebar should treat as current when the open session is a
 * hidden version-family member: the family's ROOT original row represents the
 * conversation, so highlight/group logic maps the member to its root. Returns
 * the session unchanged when it is not part of any recorded family. Never
 * throws.
 * @param current - the open session id.
 * @param byId - live session summaries by id (host parent chain).
 */
export function versionAliasedCurrent(current: SessionId | undefined): SessionId | undefined {
  if (current === undefined) return undefined
  return versionOriginalOf(current) ?? current
}

/**
 * Every member of the version family rooted at `sessionId`'s root original:
 * the root plus its recorded version forks (regenerate/edit children,
 * including forks-of-forks). Sidebar-forked sessions are deliberately NOT
 * members — a fork copies the tree into an independent conversation that
 * never interacts with this family again. Never throws.
 * @param sessionId - the root row (or any recorded version member).
 * @returns the member ids, root first, in discovery order.
 */
export function versionFamilyMembers(sessionId: SessionId): SessionId[] {
  const root = versionOriginalOf(sessionId) ?? sessionId
  const forkOriginal = forkOriginalMap()
  const children = new Map<string, string[]>()
  for (const [fork, original] of forkOriginal) {
    const list = children.get(original) ?? []
    list.push(fork)
    children.set(original, list)
  }
  const members: SessionId[] = []
  const seen = new Set<string>()
  const queue = [root]
  while (queue.length > 0) {
    const id = queue.shift() as string
    if (seen.has(id)) continue
    seen.add(id)
    members.push(id as SessionId)
    for (const child of children.get(id) ?? []) queue.push(child as SessionId)
  }
  return members
}

/**
 * Whether `sessionId` is a version-family ROOT — recorded as an `original`
 * somewhere in the version tree (it has regenerate/edit forks). Only the root
 * row of a folded family gets family-wide row actions; its visible fork rows
 * (sidebar forks) act on themselves alone.
 */
export function isVersionFamilyRoot(sessionId: SessionId): boolean {
  for (const entry of versionTreeEntries()) {
    if (entry.original === sessionId) return true
  }
  return false
}

/**
 * localStorage key of the chat-actions "last viewed version" map
 * (`{ [originalId]: sessionId }`). Written by the version pager whenever the
 * user views a version of a conversation; the sidebar restores it when the
 * conversation's row is opened, so paging to version 2 and visiting another
 * conversation does not throw the conversation back to version 1. Cross-plugin
 * convention with dsh-webchatlike; reads are fully defensive.
 */
const LAST_VERSION_KEY = 'dsh-webchatlike:last-version'

/**
 * The last version session the user viewed in `originalId`, or undefined when
 * none is recorded (or the record is missing/unreadable). Never throws.
 */
export function lastViewedVersionOf(originalId: SessionId): SessionId | undefined {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(LAST_VERSION_KEY)
    if (raw === null) return undefined
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    const viewed = (parsed as Record<string, unknown>)[originalId]
    return typeof viewed === 'string' && viewed !== '' ? (viewed as SessionId) : undefined
  } catch {
    return undefined
  }
}

/**
 * Effective recency per session for the sidebar's activity ordering: each
 * session's own `updatedAt`, except that a hidden version fork's activity
 * counts toward its ROOT original row (the visible representation of that
 * conversation) — propagated up the whole fork chain, so chatting inside any
 * version (including a version of a version) still floats the conversation to
 * the top of the sidebar. Sessions absent from `byId` are dropped; the map
 * contains only live sessions. Never throws.
 * @param byId - live session summaries by id.
 * @returns effective `updatedAt` by session id.
 */
export function effectiveUpdatedAtById(byId: Readonly<Record<SessionId, SessionSummary>>): Map<string, number> {
  const summaries = byId as Readonly<Record<string, SessionSummary>>
  const effective = new Map<string, number>()
  for (const id of Object.keys(summaries)) {
    const session = summaries[id]
    if (session !== undefined) effective.set(id, session.updatedAt)
  }
  const forkOriginal = forkOriginalMap()
  for (const forkId of forkOriginal.keys()) {
    const timestamp = summaries[forkId]?.updatedAt
    if (timestamp === undefined) continue
    let cursor: string | undefined = forkId
    const seen = new Set<string>()
    while (cursor !== undefined && !seen.has(cursor)) {
      seen.add(cursor)
      const parent = forkOriginal.get(cursor)
      if (parent === undefined) break
      const current = effective.get(parent)
      if (current === undefined) break
      if (current >= timestamp) break // the ancestor is already at least as fresh; nothing above can be older
      effective.set(parent, timestamp)
      cursor = parent
    }
  }
  return effective
}

/** Group key for Sessions outside every Workspace. */
export const UNGROUPED_KEY = ''/** Display label for the ungrouped bucket row. */
export const UNGROUPED_LABEL = 'Ungrouped'

/** One top-level session row in a group or the flat list. */
export interface SessionNode {
  id: SessionId
  /** Stored display title; the renderer substitutes the localized New Session label for blank rows. */
  title: string
  /** The provisional blank session (renderer shows the localized New Session title). */
  blank: boolean
  /** The runtime Session list reports an interaction awaiting this user. */
  pendingInteraction?: PendingInteractionStatus
  running: boolean
  /** Running descendants connected through uninterrupted subagent-origin lineage. */
  runningSubagentCount: number
  /** Finished running while not selected and not yet opened (the green "done" reminder dot). */
  completed: boolean
  updatedAt: number
}

/** Session order selected by the Workspace browser. */
export type SessionOrderBy = 'manual' | 'updated'

/** One workspace group section: header row facts + visible top-level session rows. */
export interface GroupNode {
  /** Group key: the workspace id or {@link UNGROUPED_KEY}. */
  key: string
  /** Backing Workspace id; absent only for the ungrouped bucket. */
  workspaceId: WorkspaceId | undefined
  cwd: string | undefined
  /** Workspace creation time (epoch ms); absent only for the ungrouped bucket. */
  createdAt: number | undefined
  label: string
  /** Total visible sessions in the group. */
  sessionCount: number
  expanded: boolean
  /** The group contains the selected session (active folder tint; supplied here so the renderer never scans). */
  containsCurrent: boolean
  /** Visible session rows (empty while the group is folded). */
  sessions: readonly SessionNode[]
}

/** One flat search row combining list metadata with an optional content match. */
export interface SearchResultNode {
  id: SessionId
  title: string
  workspace: string
  /** The runtime Session list reports an interaction awaiting this user. */
  pendingInteraction?: PendingInteractionStatus
  running: boolean
  /** Running descendants connected through uninterrupted subagent-origin lineage. */
  runningSubagentCount: number
  /** Finished running while not selected and not yet opened (the green "done" reminder dot). */
  completed: boolean
  snippet?: string
}

/** Bounded merged search projection plus the refine-query hint bit. */
export interface SearchResultSet {
  items: readonly SearchResultNode[]
  hasMore: boolean
}

/** Viewing state consumed by the derivation. */
export interface TreeView {
  expandedGroups: readonly string[]
  /** Browser-local order for Sessions without a backing Workspace account. */
  ungroupedOrder?: readonly string[]
}

interface Group {
  key: string
  workspaceId: WorkspaceId | undefined
  cwd: string | undefined
  createdAt: number | undefined
  label: string
  sessions: SessionSummary[]
}

/**
 * Directory display label: basename of the path (both separators accepted).
 * Ungrouped-bucket fallback for surfaces without a workspace title.
 * @param cwd - directory path, or undefined for the ungrouped bucket.
 * @returns basename, the raw cwd when it has no basename, or the ungrouped label.
 */
export function workspaceLabel(cwd: string | undefined): string {
  if (cwd === undefined || cwd === '') return UNGROUPED_LABEL
  const base = cwd.replace(/[/\\]+$/, '').split(/[/\\]/).pop()
  return base !== undefined && base !== '' ? base : cwd
}

/** Recency comparator: newest first, id as the deterministic tiebreak (ids are unique per group). */
function byRecency(a: SessionSummary, b: SessionSummary, effective: ReadonlyMap<string, number>): number {
  const aUpdatedAt = effective.get(a.id) ?? a.updatedAt
  const bUpdatedAt = effective.get(b.id) ?? b.updatedAt
  if (bUpdatedAt !== aUpdatedAt) return bUpdatedAt - aUpdatedAt
  return a.id < b.id ? -1 : 1
}

/**
 * Ordinary sessions are visible; among blank sessions, only the current one
 * is visible. Subagent children use their parent header catalog; archived
 * sessions are visible nowhere, while their accounting slots remain so
 * unarchiving restores position. Version forks (regenerate / edit-and-resend
 * children recorded by the chat-actions ledger) are ALWAYS hidden — the
 * conversation appears as its original row only, even while a fork is the
 * open session.
 */
function sessionVisible(
  session: SessionSummary,
  current: SessionId | undefined,
  archived: ReadonlySet<SessionId>,
  hidden: ReadonlySet<string>,
): boolean {
  return session.origin !== 'subagent'
    && !archived.has(session.id)
    && !hidden.has(session.id)
    && (!session.blank || session.id === current)
}

/**
 * The display title of a session row, with version-fork aliasing: a version
 * fork (regenerate/edit child recorded in the chat-actions version tree)
 * shows its ORIGINAL session's title instead of the auto-numbered fork title
 * ("你好呀 (1)"), so switching versions never looks like the conversation
 * changed identity. Falls back to the session's own title when no alias
 * applies. Reads are fully defensive.
 * @param session - the row being titled.
 * @param byId - session summaries by id (to resolve the original's title).
 * @returns the display title.
 */
function aliasedSessionTitle(session: SessionSummary, byId: Readonly<Record<string, SessionSummary>>): string {
  if (session.blank) return 'New Session'
  const originalId = versionOriginalOf(session.id)
  if (originalId !== undefined) {
    const original = byId[originalId]
    if (original !== undefined) return original.displayTitle
  }
  return session.displayTitle
}

/**
 * Resolve the ROOT ORIGINAL session id of a version fork from the chat-actions
 * version tree (`{ [atSeq]: { original, versions } }`). A session listed in
 * any turn's `versions` is a fork of that turn's `original`; because forks can
 * be forked again (regenerate/edit inside a version), the walk continues up
 * the fork chain until the ROOT original (the first session of the
 * conversation) is reached. Returns undefined when the session is not a
 * recorded fork or the tree is missing/unreadable. Never throws.
 */
function versionOriginalOf(sessionId: SessionId): SessionId | undefined {
  const forkOriginal = forkOriginalMap()
  let cursor: string | undefined = sessionId
  const seen = new Set<string>()
  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor)
    const parent = forkOriginal.get(cursor)
    if (parent === undefined) return cursor === sessionId ? undefined : (cursor as SessionId)
    cursor = parent
  }
  return undefined // cycle: malformed tree
}

/** Fork → immediate original map across every recorded turn (defensive). */
function forkOriginalMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of versionTreeEntries()) {
    for (const version of entry.versions) map.set(version, entry.original)
  }
  return map
}

/** Build one group without projecting session lineage into presentation. */
function buildGroup(
  key: string,
  workspaceId: WorkspaceId | undefined,
  cwd: string | undefined,
  createdAt: number | undefined,
  label: string,
  members: readonly SessionSummary[],
  order: 'account' | 'recency',
  effective: ReadonlyMap<string, number>,
): Group {
  const sessions = [...members]
  // Real Workspace order comes from sessionIds. Ungrouped falls back to
  // recency until the browser supplies its persisted local order.
  if (order === 'recency') sessions.sort((a, b) => byRecency(a, b, effective))
  return { key, workspaceId, cwd, createdAt, label, sessions }
}

/** Apply a stored Ungrouped order and append newly loose Sessions by recency. */
function orderedUngrouped(
  members: readonly SessionSummary[],
  stored: readonly string[],
  effective: ReadonlyMap<string, number>,
): SessionSummary[] {
  const byId = new Map(members.map(session => [session.id as string, session]))
  const included = new Set<string>()
  const ordered: SessionSummary[] = []
  for (const key of stored) {
    const session = byId.get(key)
    if (session === undefined || included.has(key)) continue
    ordered.push(session)
    included.add(key)
  }
  for (const session of [...members].sort((a, b) => byRecency(a, b, effective))) {
    if (included.has(session.id)) continue
    ordered.push(session)
  }
  return ordered
}

/**
 * Group Sessions by Host Workspace: one group per entity in stable Host
 * order, with members resolved from sessionIds in their stored order. Sessions
 * outside every Workspace trail in the browser-local Ungrouped order, which
 * falls back to recency before that order is initialized.
 */
function groupByWorkspace(
  list: SessionListState,
  workspaces: readonly WorkspaceView[],
  archived: ReadonlySet<SessionId>,
  hidden: ReadonlySet<string>,
  ungroupedOrder: readonly string[] | undefined,
  effective: ReadonlyMap<string, number>,
): Group[] {
  const groups: Group[] = []
  const accounted = new Set<SessionId>()
  for (const workspace of workspaces) {
    const members: SessionSummary[] = []
    for (const id of workspace.sessionIds) {
      const summary = list.byId[id]
      if (summary === undefined) continue // account may lead the list pull; the row appears when the summary lands
      accounted.add(id)
      if (!sessionVisible(summary, list.current, archived, hidden)) continue
      members.push(summary)
    }
    groups.push(buildGroup(
      workspace.workspaceId, workspace.workspaceId, workspace.path,
      Date.parse(workspace.createdAt), workspace.title, members, 'account', effective,
    ))
  }
  const stray = list.ids
    .map(id => list.byId[id])
    .filter((s): s is SessionSummary =>
      s !== undefined && !accounted.has(s.id) && sessionVisible(s, list.current, archived, hidden))
  if (stray.length > 0) {
    groups.push(buildGroup(
      UNGROUPED_KEY,
      undefined,
      undefined,
      undefined,
      UNGROUPED_LABEL,
      ungroupedOrder === undefined ? stray : orderedUngrouped(stray, ungroupedOrder, effective),
      ungroupedOrder === undefined ? 'recency' : 'account',
      effective,
    ))
  }
  return groups
}

function sessionNode(
  s: SessionSummary,
  descendants: ReadonlyMap<SessionId, SubagentDescendantSummary>,
  byId: Readonly<Record<string, SessionSummary>>,
): SessionNode {
  return {
    id: s.id,
    title: aliasedSessionTitle(s, byId),
    blank: s.blank,
    running: s.running,
    runningSubagentCount: descendants.get(s.id)?.runningCount ?? 0,
    completed: s.completed === true,
    updatedAt: s.updatedAt,
    ...(s.pendingInteraction === undefined ? {} : { pendingInteraction: s.pendingInteraction }),
  }
}

/**
 * Derive the workspace browser groups with every session as a top-level row.
 *
 * Every group shows; sessions populate under expanded groups in the selected
 * local order. Blank sessions are excluded except for the selected
 * provisional New Session row; archived sessions are excluded everywhere.
 * Content search lives outside this derivation
 * (see {@link deriveSearchResults}).
 * @param list - sessions list snapshot (`current` feeds containsCurrent via
 * {@link versionAliasedCurrent}: an open version fork highlights its
 * original's group).
 * @param workspaces - real workspaces in stable Host order.
 * @param archivedSessionIds - registry-global archive set.
 * @param view - local expansion arrays.
 * @returns group sections in render order.
 */
export function deriveGroups(
  list: SessionListState,
  workspaces: readonly WorkspaceView[],
  archivedSessionIds: readonly SessionId[],
  view: TreeView,
): GroupNode[] {
  const archived = new Set(archivedSessionIds)
  const hidden = hiddenVersionSessionIds()
  const expandedGroups = new Set(view.expandedGroups)
  const descendants = indexSubagentDescendants(list.byId)
  const effective = effectiveUpdatedAtById(list.byId)
  const current = versionAliasedCurrent(list.current)
  const currentGroup = current === undefined
    ? undefined
    : (workspaces.find(w => w.sessionIds.includes(current as SessionId))?.workspaceId as string | undefined)
        ?? UNGROUPED_KEY
  const groups: GroupNode[] = []
  for (const g of groupByWorkspace(list, workspaces, archived, hidden, view.ungroupedOrder, effective)) {
    const expanded = expandedGroups.has(g.key)
    groups.push({
      key: g.key,
      workspaceId: g.workspaceId,
      cwd: g.cwd,
      createdAt: g.createdAt,
      label: g.label,
      sessionCount: g.sessions.length,
      expanded,
      containsCurrent: g.key === currentGroup,
      sessions: expanded ? g.sessions.map(session => sessionNode(session, descendants, list.byId as unknown as Record<string, SessionSummary>)) : [],
    })
  }
  return groups
}

/**
 * Derive the flat session list ("In one list" mode): every session — fork
 * children included — as a top-level row, strictly newest-first. No grouping,
 * no parent/child adjacency. Content search lives outside this derivation
 * (see {@link deriveSearchResults}).
 * @param list - sessions list snapshot.
 * @param archivedSessionIds - registry-global archive set.
 * @returns flat rows in render order.
 */
export function deriveFlat(
  list: SessionListState,
  archivedSessionIds: readonly SessionId[],
): SessionNode[] {
  const archived = new Set(archivedSessionIds)
  const hidden = hiddenVersionSessionIds()
  const descendants = indexSubagentDescendants(list.byId)
  const effective = effectiveUpdatedAtById(list.byId)
  const rows: SessionSummary[] = []
  for (const id of list.ids) {
    const s = list.byId[id]
    if (s === undefined || !sessionVisible(s, list.current, archived, hidden)) continue
    rows.push(s)
  }
  rows.sort((a, b) => byRecency(a, b, effective))
  return rows.map(session => sessionNode(session, descendants, list.byId as unknown as Record<string, SessionSummary>))
}

/** Relative-time bucket of a session row's trailing label. */
export type RelativeTimeUnit = 'now' | 'minutes' | 'hours' | 'days' | 'months' | 'years'

/** Structured relative time: the bucket plus its magnitude (0 for 'now'). */
export interface RelativeTime {
  unit: RelativeTimeUnit
  n: number
}

/**
 * Merge immediate title/Workspace substring matches with ranked Host content
 * matches. Local rows lead newest-first, content-only rows retain backend
 * order, and duplicate sessions receive the backend snippet in place.
 * @param list - session metadata authority.
 * @param workspaces - Workspace membership and display labels.
 * @param query - caller text; surrounding whitespace is ignored.
 * @param archivedSessionIds - registry-global archive set (members never match).
 * @param content - ranked Host content-search page.
 * @param limit - protocol-owned maximum merged row count.
 * @returns bounded deduplicated flat rows and a refine-query hint bit.
 */
export function deriveSearchResults(
  list: SessionListState,
  workspaces: readonly WorkspaceView[],
  query: string,
  archivedSessionIds: readonly SessionId[],
  content: { items: readonly SessionSearchResultItem[]; hasMore: boolean },
  limit: number,
): SearchResultSet {
  const q = query.trim().toLowerCase()
  if (q === '') return { items: [], hasMore: false }
  const archived = new Set(archivedSessionIds)
  // Search deliberately does NOT hide version forks: it is the escape hatch
  // to reach a fork the sidebar keeps out of sight.
  const hidden: ReadonlySet<string> = new Set()
  const descendants = indexSubagentDescendants(list.byId)

  const workspaceBySession = new Map<SessionId, string>()
  for (const workspace of workspaces) {
    for (const sessionId of workspace.sessionIds) {
      if (!workspaceBySession.has(sessionId)) workspaceBySession.set(sessionId, workspace.title)
    }
  }
  const labelOf = (summary: SessionSummary): string =>
    workspaceBySession.get(summary.id) ?? workspaceLabel(summary.cwd)
  const contentBySession = new Map<SessionId, SessionSearchResultItem>()
  for (const item of content.items) {
    if (!contentBySession.has(item.sessionId)) contentBySession.set(item.sessionId, item)
  }

  const local: SessionSummary[] = []
  for (const id of list.ids) {
    const summary = list.byId[id]
    // Blank placeholders never match a query (their canonical title displays
    // localized, so matching it would tie search to one language).
    if (summary === undefined || summary.blank || !sessionVisible(summary, list.current, archived, hidden)) continue
    if (
      aliasedSessionTitle(summary, list.byId as unknown as Record<string, SessionSummary>).toLowerCase().includes(q)
      || labelOf(summary).toLowerCase().includes(q)
    ) {
      local.push(summary)
    }
  }
  local.sort((a, b) => byRecency(a, b, effectiveUpdatedAtById(list.byId)))

  const ordered: SessionSummary[] = []
  const included = new Set<SessionId>()
  const include = (summary: SessionSummary): void => {
    if (included.has(summary.id)) return
    included.add(summary.id)
    ordered.push(summary)
  }
  for (const summary of local) include(summary)
  for (const item of content.items) {
    const summary = list.byId[item.sessionId]
    if (summary !== undefined && !summary.blank && sessionVisible(summary, list.current, archived, hidden)) include(summary)
  }

  return {
    items: ordered.slice(0, limit).map((summary) => {
      const match = contentBySession.get(summary.id)
      return {
        id: summary.id,
        title: aliasedSessionTitle(summary, list.byId as unknown as Record<string, SessionSummary>),
        workspace: labelOf(summary),
        running: summary.running,
        runningSubagentCount: descendants.get(summary.id)?.runningCount ?? 0,
        ...(summary.pendingInteraction === undefined
          ? {}
          : { pendingInteraction: summary.pendingInteraction }),
        completed: summary.completed === true,
        ...match === undefined ? {} : { snippet: match.snippet },
      }
    }),
    hasMore: content.hasMore || ordered.length > limit,
  }
}

/**
 * Compact relative time for session rows, as a structured bucket the
 * renderer localizes ("now"/"5min"/"3h"/"2d"/"4mo"/"1y" in en).
 * @param updatedAt - epoch ms of the session's last activity.
 * @param now - current epoch ms (injected for pure rendering).
 * @returns the row's trailing time bucket and magnitude.
 */
export function relativeTime(updatedAt: number, now: number): RelativeTime {
  const MIN = 60_000
  const HOUR = 3_600_000
  const DAY = 86_400_000
  const diff = Math.max(0, now - updatedAt)
  if (diff < MIN) return { unit: 'now', n: 0 }
  if (diff < HOUR) return { unit: 'minutes', n: Math.floor(diff / MIN) }
  if (diff < DAY) return { unit: 'hours', n: Math.floor(diff / HOUR) }
  if (diff < 30 * DAY) return { unit: 'days', n: Math.floor(diff / DAY) }
  if (diff < 365 * DAY) return { unit: 'months', n: Math.floor(diff / (30 * DAY)) }
  return { unit: 'years', n: Math.floor(diff / (365 * DAY)) }
}
