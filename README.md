# dsh-webchatlike

> Bring the **DeepSeek web / app chat experience** to DeepSeek Harness: edit your question, regenerate the answer, and flip between versions — right on the message, like chatting on deepseek.com.

![MIT](https://img.shields.io/badge/license-MIT-blue) ![DSH plugin](https://img.shields.io/badge/dsh-plugin-4f7cf7)

A client plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI that makes conversations behave like the deepseek.com web/app chat — in-place editing, one-click regeneration, and a per-message version pager.

- **✏️ Edit & resend** — hover your own message, edit it **in place** (no modal, no new chat), and resend. A clean fork restarts from the turn before your question: `history + edited question + new answer`.
- **🔄 Regenerate** — hover any assistant reply and regenerate it from the turn before. The old question is **not** duplicated into context.
- **<i/N> Version pager** — every message whose turn was regenerated or edited gets a deepseek.com-style `<2/5>` pager (tree model: **each message's versions are counted independently**). Flip through versions with the chevrons; the same turn is scrolled into view. The version you were viewing is remembered per conversation, so switching chats and coming back does not throw you to version 1.
- **🗑️ Delete session** (patch) — delete a session from the sidebar context menu, including its on-disk log.

The sidebar stays clean: version forks are folded into their original conversation (one row per conversation), and activity inside any version still floats that conversation to the top.

## ⚠ Requires 2 source patches

Unlike pure plugins, this one extends two harness **source files** that have no public extension points:

| Patch | Files | What it adds |
|---|---|---|
| `ui-conversation` user-actions slot | 4 files | the ✏️ button seat under user messages + the in-place edit anchor (`position: relative`) |
| `ui-workspace` version-fork folding | 2 files | hide version forks from the sidebar (always), alias the open fork to its original row, fold fork activity into the conversation's recency, restore the last-viewed version |

Without them the plugin loads but the edit button and sidebar folding stay off. `cordis.patch.yml` only loads the plugin itself.

## Install

### 1. Apply the source patches

```bash
cd deepseek-harness
/path/to/dsh-webchatlike/apply-patches.sh   # copies files, prompts on conflicts
pnpm install
pnpm run build:lib:client && pnpm run build:web
```

### 2. Install the plugin

Either install it as a bundle (it declares `dsh.bundle`):

```bash
dsh plugin --profile web add <this-repo-git-url-or-npm-name>
```

…or register it manually in `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: chat-actions
      name: 'dsh-webchatlike'
```

If you install manually, make the package resolvable from the profile (e.g. add it to `~/.dsh/profiles/web/package.json` dependencies and `pnpm install` there).

### 3. Restart

Ctrl+C and `pnpm dsh web` again, then refresh the browser.

## Usage

- Hover an **assistant reply** → 🔄 to regenerate.
- Hover a **user message** → ✏️ to edit in place and resend.
- After several 🔄/✏️ on the same turn, the reply shows **<2/5>**; use the chevrons to switch versions.
- Sidebar row ⋯ menu → **Delete session** (with confirmation; running sessions are refused).

## How it works

- Every version is a real fork session. The fork cut lands **before** the target turn, so the new session is `history + question + new answer` — matching deepseek.com's tree model.
- The plugin records forks in a localStorage version tree (`dsh-webchatlike:version-tree`, keyed by the turn's fork boundary), and the "last viewed version" map (`dsh-webchatlike:last-version`). Reads are fully defensive: without the plugin the sidebar behaves exactly as stock.
- The version pager renders on **every** versioned message; switching opens the sibling fork and scrolls the same turn into view. `seedLength` is not used — no host changes needed for versioning.

## FAQ

**Why are there no buttons on the very first message of a conversation?** The first turn has no clean fork boundary before it (the harness fork needs a completed turn to anchor to), so regenerate/edit are unavailable there — same as the first message in most web chats.

## Relationship to upstream

- The plugin itself uses only harness **public extension points** (`conversation.chat.assistant-actions` / `conversation.chat.user-actions` slots, `ctx.sessions.fork`, `session.prompt`, `ctx.sessions.open`).
- The two patches are small, self-contained core changes (6 files total). Re-apply after upstream updates — `apply-patches.sh` diffs and asks before overwriting.

## License

MIT
