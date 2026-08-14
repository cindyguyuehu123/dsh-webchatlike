/**
 * dsh-webchatlike: web-chat-like message actions for the Harness web GUI.
 *
 * Regenerate lives on the assistant-message action strip
 * (conversation.chat.assistant-actions); edit-and-resend lives on the
 * user-message action strip (conversation.chat.user-actions, contributed by
 * the ui-conversation user-actions slot patch). Both fork the session
 * *before* the target turn — so the inherited history carries no duplicate
 * prompt — open the child, and queue the (edited) prompt through the
 * session's public `prompt` face.
 *
 * @module dsh-webchatlike/client
 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (the action-strip entries).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { EditAction, RegenerateActions } from './ChatActions.tsx'
import { VersionPager, recordVersionFork } from './VersionPager.tsx'
import type { ChatActionsInjected } from './slots.ts'
import { en, zh } from './locales.ts'

export type { ChatActionsInjected, EditActionProps, RegenerateActionProps } from './slots.ts'
export type { ChatActionsKey } from './locales.ts'
export { readVersionTree, recordVersionFork, versionFamilyOf } from './VersionPager.tsx'

/** Dictionary namespace owned by this plugin. */
const NS = 'chat-actions'

/** Required services: the slot registry, the session navigator, and the copy. */
export const inject = ['slots', 'sessions', 'locale']

/**
 * Client plugin body: regenerate on the assistant strip, edit-and-resend on
 * the user strip, and a version pager that flips between the sibling forks
 * of the same turn (web-chat style).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-webchatlike: dictionaries')

  const forkAndReplayFor = (sessionId: SessionId): ChatActionsInjected => ({
    forkAndReplay: async (forkSeq, text) => {
      if (text === '') return
      try {
        const childId = await ctx.sessions.fork({ sessionId, atSeq: forkSeq, increaseTitle: true })
        // The plugin is the only fork caller for regenerate/edit: record the
        // child as a version of this turn immediately (atSeq = fork boundary
        // = the logical-turn fingerprint), so the pager can address it before
        // any host list refresh.
        recordVersionFork(childId, sessionId, forkSeq)
        ctx.sessions.open(childId)
        const session = ctx.sessions.binding(childId)?.session
        if (session !== undefined) {
          await session.prompt([{ type: 'text', text }], 'queue')
        }
      } catch (error) {
        // A failed fork/replay must not look like a successful regenerate:
        // surface it so the user knows nothing happened (the source session
        // stays untouched).
        console.error('[dsh-webchatlike] fork/replay failed:', error)
      }
    },
    openSession: (target) => { ctx.sessions.open(target) },
  })

  ctx.slots.inject('conversation.chat.assistant-actions', () => {
    const dispose = ctx.slots.register({
      name: 'conversation.chat.assistant-actions',
      id: 'chat-actions-version-pager',
      order: 10,
      locale: NS,
      inject: (sessionId) => forkAndReplayFor(sessionId),
    }, VersionPager)
    const regenerate = ctx.slots.register({
      name: 'conversation.chat.assistant-actions',
      id: 'chat-actions-regenerate',
      order: 20,
      locale: NS,
      inject: (sessionId) => forkAndReplayFor(sessionId),
    }, RegenerateActions)
    return () => { dispose(); regenerate() }
  })

  ctx.slots.inject('conversation.chat.user-actions', () => {
    const dispose = ctx.slots.register({
      name: 'conversation.chat.user-actions',
      id: 'chat-actions-edit',
      order: 20,
      locale: NS,
      inject: (sessionId) => forkAndReplayFor(sessionId),
    }, EditAction)
    return dispose
  })
}
