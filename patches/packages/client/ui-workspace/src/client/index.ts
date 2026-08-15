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
  familyEntriesOfRoot, isVersionFamilyRoot, versionFamilyMembers, writeFamilyTree,
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
 * Fork a whole version family: copy EVERY recorded member (the root and all
 * regenerate/edit versions) into a brand-new independent tree, mirroring the
 * same atSeq/original relationships under the new root's namespace. The copy
 * root gets a distinct title (`base (副本)` / `base (副本 N)`) so the sidebar
 * can tell the trees apart; everything else stays default. The new tree is
 * opened and never interacts with the source tree again.
 * @param ctx - client root context.
 * @param rootId - the family ROOT session (the row being forked).
 */
async function forkVersionFamily(
  ctx: ClientContext,
  rootId: SessionId,
  sourceSessionId: SessionId,
): Promise<void> {
  const entries = familyEntriesOfRoot(rootId)
  const members = versionFamilyMembers(rootId)
  // The session the user forked FROM must be copied too, even when the
  // version tree does not record it as a member: the copy opens AT that
  // session's copy, not at the tree root.
  if (sourceSessionId !== rootId && !members.includes(sourceSessionId)) members.push(sourceSessionId)
  // Fork every member; the ROOT first — its copy becomes the new root.
  const map = new Map<string, SessionId>()
  const newRoot = await ctx.sessions.fork({ sessionId: rootId })
  map.set(rootId, newRoot)
  for (const member of members) {
    if (member === rootId) continue
    try {
      const child = await ctx.sessions.fork({ sessionId: member })
      map.set(member, child)
    } catch (reason: unknown) {
      // One version with no completed turn refuses to fork; skip it and keep
      // copying the rest — the copy tree records only the successes.
      console.warn('[dsh-webchatlike] version copy skipped (source may have no completed turn):', member, reason)
    }
  }
  // Mirror the copied tree under the new root (identical atSeq fingerprints).
  const copied: Record<string, { original: SessionId; versions: SessionId[] }> = {}
  for (const [atSeqKey, entry] of Object.entries(entries)) {
    const original = map.get(entry.original)
    if (original === undefined) continue
    copied[atSeqKey] = {
      original,
      versions: entry.versions
        .map(version => map.get(version))
        .filter((version): version is SessionId => version !== undefined),
    }
  }
  writeFamilyTree(newRoot, copied)
  // Distinct copy title: count existing `base (副本...)` rows for the suffix.
  const byId = ctx.sessions.list.getSnapshot().byId as Readonly<Record<string, SessionSummary>>
  const base = byId[rootId]?.title ?? '会话'
  const copyCount = Object.values(byId)
    .filter(session => session.title?.startsWith(`${base} (副本`)).length
  const copyTitle = copyCount === 0 ? `${base} (副本)` : `${base} (副本 ${copyCount + 1})`
  const session = ctx.sessions.binding(newRoot)?.session
  if (session !== undefined) {
    const renamed = await session.rename(copyTitle)
    if (!renamed.ok) console.warn('[dsh-webchatlike] copy rename failed:', renamed.error.message)
  }
  // Open the copy of the session the user forked FROM (the whole tree was
  // copied, so the same position exists in the new tree); the pager lets them
  // move anywhere else.
  ctx.sessions.open(map.get(sourceSessionId) ?? newRoot)
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
      // A version-family ROOT row forks the WHOLE tree: every recorded
      // version is copied into an independent new tree (new root + copies of
      // all versions under the same atSeq fingerprints), which never
      // interacts with the source tree again. Any other row keeps the stock
      // single-session fork.
      if (isVersionFamilyRoot(sessionId)) {
        // Forking a family row: open the copy of the session the user is
        // CURRENTLY in (when it is a family member), so the new tree lands on
        // the same version instead of its root.
        const current = ctx.sessions.list.getSnapshot().current
        const source = current !== undefined && versionFamilyMembers(sessionId).includes(current)
          ? current
          : sessionId
        void forkVersionFamily(ctx, sessionId, source).catch((reason: unknown) => {
          console.error('[dsh-webchatlike] family fork failed:', reason)
        })
        return
      }
      ctx.sessions.fork({ sessionId, increaseTitle: true })
        .then((childId) => { ctx.sessions.open(childId) })
        .catch((reason: unknown) => {
          console.error('[dsh-webchatlike] session fork failed:', reason)
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
