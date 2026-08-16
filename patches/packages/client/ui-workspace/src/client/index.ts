/**
 * Workspace plugin, browser half. Two registrations: WorkspaceBrowser fills
 * the sidebar shell's `sidebar.workspaces` hole (the whole browsing region),
 * and WorkspacePicker fills the conversation hero's picker hole
 * (`conversation.hero.workspace` — both hero forms). Both read real Host
 * Workspaces through the global useWorkspaces hook, and each declares its
 * own `single` directory-flow child hole for the composed picker package's
 * client half (see the contract module doc). Export discipline:
 * packages/client/AGENTS.md.
 */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClientContext, SessionId, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { WorkspaceBrowserInjected, WorkspacePickerInjected } from './contract/slots.ts'
import { createWorkspaceViewStore } from './stores.ts'
import { WorkspaceBrowser } from './WorkspaceBrowser.tsx'
import { WorkspacePicker } from './WorkspacePicker.tsx'
import {
  familyEntriesOfRoot, writeFamilyTree,
} from './tree.ts'
import { en, zh, type WorkspaceKey } from './locales.ts'

export type {
  DirectoryFlowOwnerProps, DirectoryFlowSlotName, DirectoryPickingHooks, DirectoryPickingInjected,
  WorkspaceBrowserInjected, WorkspaceBrowserProps, WorkspacePickerInjected, WorkspacePickerProps,
} from './contract/slots.ts'
export type { WorkspaceKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The workspace browsing region and pick/create flow copy. */
    workspace: WorkspaceKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'workspace'

/**
 * Required services (cordis fiber inject). The target slots are declared by
 * the ui-sidebar / ui-conversation applies, whose activation order relative
 * to this one is NOT constrained: dsh.client.inject edges are informational
 * (loading/prefetch metadata, never apply sequencing) and neither owner
 * provides a waitable service. apply therefore depends on each slot
 * declaration through `slots.inject()` instead of assuming order.
 */
export const inject = ['slots', 'sessions', 'workspaces', 'locale']

/**
 * The distinct copy title for a sidebar-created fork: `base (副本)`, or the
 * next `base (副本 N)` when copies already exist. This marker is the sidebar's
 * tell for an INDEPENDENT fork copy (as opposed to a regenerate/edit version
 * fork, whose auto title is `base (1)`): the row-visibility inference keeps
 * `(副本)`-titled sessions visible as ordinary rows.
 * @param byId - live session summaries (to count existing copies).
 * @param base - the source session's title.
 * @returns the copy title to rename the new session to.
 */
function nextCopyTitle(byId: Readonly<Record<string, { title?: string }>>, base: string): string {
  const copyCount = Object.values(byId)
    .filter(session => session.title?.startsWith(`${base} (副本`)).length
  return copyCount === 0 ? `${base} (副本)` : `${base} (副本 ${copyCount + 1})`
}

/**
 * Sidebar fork: copy the session's PARENT CHAIN into an independent new
 * family. The chain runs from the topmost ancestor (a session without a
 * parent) down to the forked session; every chain member is copied, the copy
 * root is fully independent (no parent link), and each child copy is
 * re-parented to the copy of its original parent — the new tree is a complete
 * family of its own and never points back at the source tree (forking `b` in
 * `a -> (b, c, d)` yields `a' -> (b')`). Recorded version relationships among
 * the copied chain members are mirrored under the new root's namespace. The
 * copy root is titled `base (副本)` / `base (副本 N)`, and the new tree opens
 * at the copy of the session the user forked FROM.
 * @param ctx - client root context.
 * @param sessionId - the session row being forked.
 */
async function forkChain(
  ctx: ClientContext,
  sessionId: SessionId,
): Promise<void> {
  const byId = ctx.sessions.list.getSnapshot().byId
  // Collect the parent chain, topmost ancestor first; a subagent ancestor is
  // not a user fork target and stops the walk.
  const chain: SessionId[] = []
  const seen = new Set<string>()
  let cursor: SessionId | undefined = sessionId
  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor)
    const summary: SessionSummary | undefined = byId[cursor]
    if (summary === undefined) break
    if (summary.origin === 'subagent') break
    chain.unshift(cursor)
    cursor = summary.parentId
  }
  if (chain.length === 0) throw new Error(`sidebar fork: unknown or subagent session "${String(sessionId)}"`)
  // Copy every member top-down so each child's parent copy already exists;
  // the topmost copy gets no parent link at all.
  const map = new Map<string, SessionId>()
  for (const node of chain) {
    const parentId = byId[node]?.parentId
    const parentCopy = parentId === undefined ? null : (map.get(parentId) ?? null)
    const child = await ctx.sessions.fork({
      sessionId: node,
      ...(parentCopy === null ? { parentSession: null } : { parentSession: parentCopy }),
    })
    map.set(node, child)
  }
  const rootId = chain[0] as SessionId
  // Mirror version relationships among the copied chain members (siblings of
  // the chain are NOT copied).
  const chainSet = new Set<string>(chain)
  const copied: Record<string, { original: SessionId; versions: SessionId[] }> = {}
  for (const [atSeqKey, entry] of Object.entries(familyEntriesOfRoot(rootId))) {
    if (!chainSet.has(entry.original)) continue
    const original = map.get(entry.original)
    if (original === undefined) continue
    const versions = entry.versions
      .filter(version => chainSet.has(version))
      .map(version => map.get(version))
      .filter((version): version is SessionId => version !== undefined)
    if (versions.length === 0) continue
    copied[atSeqKey] = { original, versions }
  }
  if (Object.keys(copied).length > 0) {
    const newRoot = map.get(rootId)
    if (newRoot !== undefined) writeFamilyTree(newRoot, copied)
  }
  // Distinct copy title: `base (副本)` / `base (副本 N)` — the sidebar marker
  // that keeps an independent fork copy visible as an ordinary row.
  const byIdNow = ctx.sessions.list.getSnapshot().byId as Readonly<Record<string, SessionSummary>>
  const newRoot = map.get(rootId)
  if (newRoot !== undefined) {
    const session = ctx.sessions.binding(newRoot)?.session
    if (session !== undefined) {
      const renamed = await session.rename(nextCopyTitle(byIdNow, byIdNow[rootId]?.title ?? '会话'))
      if (!renamed.ok) console.warn('[dsh-webchatlike] copy rename failed:', renamed.error.message)
    }
  }
  // Open the copy of the session the user forked FROM.
  const openTarget = map.get(sessionId) ?? newRoot
  if (openTarget !== undefined) ctx.sessions.open(openTarget)
}

/**
 * Register the browser and picker once their slot declarations are on the
 * ledger. Inject factories return plain callbacks; data reads use the
 * framework's global hooks.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-workspace: dictionaries')

  const searchSessions: WorkspaceBrowserInjected['searchSessions'] = async (query, signal) => {
    const result = await ctx.sessions.search(query, signal)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }

  // Stable per-surface occupancy sources (the renderer's hook cache keys by
  // source identity): true while the surface's directory-flow hole is filled.
  const flowSource = (hole: 'sidebar.workspaces.directoryFlow' | 'conversation.hero.workspace.directoryFlow'): HostObservable<boolean> => ({
    getSnapshot: () => ctx.slots.entries(hole).length > 0,
    subscribe: listener => ctx.slots.subscribe(hole, listener),
  })
  const browserFlowSource = flowSource('sidebar.workspaces.directoryFlow')
  const pickerFlowSource = flowSource('conversation.hero.workspace.directoryFlow')
  const browserInjected = (): WorkspaceBrowserInjected => ({
    // Explicit group actions keep their target; unscoped New Session inherits
    // the current Session Workspace before the recent-Workspace fallback.
    startSession: (workspaceId) => { ctx.workspaces.startSession(workspaceId) },
    open: (sessionId) => { ctx.sessions.open(sessionId) },
    searchSessions,
    searchResultLimit: ctx.sessions.searchResultLimit,
    renameSession: async (sessionId, title) => {
      // Row → session-face hop: rename is a per-session verb (ISession), not
      // a list-service verb; the binding resolves any listed session.
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) throw new Error(`unknown session "${sessionId}"`)
      const result = await session.rename(title)
      if (!result.ok) throw new Error(result.error.message)
    },
    forkSession: (sessionId) => {
      // dsh-webchatlike: the sidebar fork copies the session's parent chain
      // into an independent new family — new root without a parent link,
      // child copies re-parented to their original parent's copy — and opens
      // the copy of the forked session.
      void forkChain(ctx, sessionId).catch((reason: unknown) => {
        console.error('[dsh-webchatlike] sidebar fork failed:', reason)
      })
    },
    renameWorkspace: async (workspaceId, title) => { await ctx.workspaces.rename(workspaceId, title) },
    deleteWorkspace: async (workspaceId) => { await ctx.workspaces.delete(workspaceId) },
    insertWorkspaceBefore: async (workspaceId, beforeWorkspaceId) => {
      await ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId)
    },
    archiveSession: async (sessionId) => { await ctx.workspaces.archiveSession(sessionId) },
    deleteSession: async (sessionId) => { await ctx.workspaces.deleteSession(sessionId) },
    insertSessionBefore: async (workspaceId, sessionId, beforeSessionId) => {
      await ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId)
    },
    createWorkspace: input => ctx.workspaces.create(input),
    hooks: { directoryFlow: browserFlowSource },
  })
  const pickerInjected = (): WorkspacePickerInjected => ({
    createWorkspace: input => ctx.workspaces.create(input),
    hooks: { directoryFlow: pickerFlowSource },
  })
  // Each registration declares its directory-flow child in the same call;
  // slot injection follows both the owner and declaration HMR lifetimes.
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register(
    {
      name: 'sidebar.workspaces',
      children: { 'sidebar.workspaces.directoryFlow': { kind: 'single', scope: 'root' } },
      store: createWorkspaceViewStore(),
      inject: browserInjected,
      locale: NS,
    },
    WorkspaceBrowser,
  ))
  ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register(
    {
      name: 'conversation.hero.workspace',
      children: { 'conversation.hero.workspace.directoryFlow': { kind: 'single', scope: 'root' } },
      inject: pickerInjected,
      locale: NS,
    },
    WorkspacePicker,
  ))
}
