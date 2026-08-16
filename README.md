# dsh-webchatlike

> 把 **DeepSeek 网页版 / App 的聊天体验**带进 DeepSeek Harness：编辑提问、重新生成回复、在消息上直接翻版本——就像在 deepseek.com 上聊天一样。

![MIT](https://img.shields.io/badge/license-MIT-blue) ![DSH plugin](https://img.shields.io/badge/dsh-plugin-4f7cf7)

一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI 的客户端插件,让对话行为和 deepseek.com 网页版 / App 一致:原位编辑、一键重新生成、逐条消息的版本翻页器。

- **✏️ 编辑重发**——悬停**自己的消息**,在原消息位置**就地**打开编辑框(预填原提问,无弹窗、不新建对话),改完重发。fork 点选在提问回合之前,新会话是干净的 `历史 + 修改后的提问 + 新回答`。
- **🔄 重新生成**——悬停任意 assistant 回复,从该回合之前分叉重新生成。旧提问**不会**重复塞进上下文。
- **<i/N> 版本翻页**——**每条**被重新生成 / 编辑重发过的消息旁都会出现 deepseek.com 风格的 `<2/5>` 翻页器(树状模型:**每条消息的版本独立计数**)。左右箭头切换版本,自动定位到同一轮。每个对话记住你最后查看的版本——切去别的对话再回来,不会跳回第 1 版。
- **🌳 分叉整棵树**——「在新对话中分支」(对话内或边栏)会把**整棵树**复制成一份**完全独立的副本**:新根 + 每个版本的副本,新树自带完整版本体系(`<i/N>` 可翻),从此与原树互不影响。副本根标题带 `(副本)` / `(副本 2)` 递增,分叉后自动定位到你 fork 时所在的版本。**任意**侧边栏 / 对话内分叉出来的独立副本(包括非版本族会话的单会话分叉)都带 `(副本)` 标记——它是边栏区分"独立副本"与"regenerate/编辑版本"的记号,保证新副本一定以独立行出现,不会被折叠隐藏。
- **🗑️ 删除会话**(需补丁)——从左侧会话菜单彻底删除会话,连同硬盘上的会话日志。

边栏保持干净:版本 fork 折叠进原始对话(一个对话一行),在任意版本里的活动都会照常把该对话浮到顶部。**家族根行**上的重命名、归档、删除作用于整棵树(所有 regenerate/编辑版本);分叉副本是完全独立的对话,只作用于自身。

## ⚠ 依赖 2 个源码补丁

与纯插件不同,本插件扩展了两个 harness **没有公开扩展点**的源码文件:

| 补丁 | 文件数 | 作用 |
|---|---|---|
| ui-conversation user-actions 插槽 | 5 | 用户消息下方的 ✏️ 按钮座位 + 原位编辑锚点(`position: relative`)+ 对话内「分支」复制整棵树 |
| ui-workspace 版本折叠 | 4 | 边栏永远隐藏版本 fork、当前版本映射回原始行、版本内活动折算进对话排序、恢复最后查看的版本、家族级行操作、边栏分叉复制整棵树 |

不打补丁时插件能加载,但**编辑按钮和边栏折叠不会出现**。`cordis.patch.yml` 只负责加载插件本身。

## 安装

### 1. 打源码补丁

```bash
cd deepseek-harness
/path/to/dsh-webchatlike/apply-patches.sh   # 逐个复制,冲突时提示
pnpm install
pnpm run build:lib:client && pnpm run build:web
```

### 2. 安装插件

方式一:作为 bundle 安装(已声明 `dsh.bundle`):

```bash
dsh plugin --profile web add <本仓库 git 地址或 npm 包名>
```

方式二:手动在 `~/.dsh/profiles/web/cordis.patch.yml` 注册:

```yaml
- insert:
    - id: chat-actions
      name: 'dsh-webchatlike'
```

手动安装时,请把包加入 `~/.dsh/profiles/web/package.json` 的 dependencies 并在 profile 目录执行 `pnpm install`,让加载器能解析到它。

### 3. 重启

终端 Ctrl+C,重新 `pnpm dsh web`,刷新页面。

## 使用

- 悬停任意 **assistant 回复** → 🔄 重新生成
- 悬停任意 **用户消息** → ✏️ 原位编辑重发
- 对同一回合多次 🔄 / ✏️ 后,回复旁出现 **<2/5>**,点左右箭头切换版本
- 左侧会话列表行尾 ⋯ 菜单 → **删除会话**(带确认框;正在运行的会话拒绝删除)

## 工作原理

- 每个版本都是一个真实的 fork 会话。fork 点选在**目标回合之前**,新会话 = `历史 + 提问 + 新回答`——与 deepseek.com 的树状模型一致。
- 插件把 fork 记录在 localStorage 版本树(`dsh-webchatlike:version-tree`,按**家族根**命名空间:每棵树一个命名空间,分叉副本与原树互不干扰)和「最后查看版本」映射(`dsh-webchatlike:last-version`)里。所有读取都是防御式的:没有插件时,边栏行为与原生完全一致。
- 版本翻页器渲染在**每条**版本化消息上;切换打开兄弟 fork 并滚动定位到同一轮。不依赖 `seedLength`——版本功能不需要任何 host 改动。

## FAQ

**为什么对话的第一条消息没有按钮?** 第一回合之前没有干净的 fork 边界(harness 的 fork 需要一个已完成的回合作为锚点),所以第一条消息不能重新生成 / 编辑——和大多数网页版聊天一致。

## 与上游的关系

- 插件本身只用 harness **公开扩展点**(`conversation.chat.assistant-actions` / `conversation.chat.user-actions` 插槽、`ctx.sessions.fork`、`session.prompt`、`ctx.sessions.open`)。
- 两个补丁是小而自洽的核心改动(共 9 个文件)。上游更新后重新应用即可——`apply-patches.sh` 会先对比再覆盖。

## License

MIT

---

# dsh-webchatlike

> Bring the **DeepSeek web / app chat experience** to DeepSeek Harness: edit your question, regenerate the answer, and flip between versions — right on the message, like chatting on deepseek.com.

![MIT](https://img.shields.io/badge/license-MIT-blue) ![DSH plugin](https://img.shields.io/badge/dsh-plugin-4f7cf7)

A client plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI that makes conversations behave like the deepseek.com web/app chat — in-place editing, one-click regeneration, and a per-message version pager.

- **✏️ Edit & resend** — hover your own message, edit it **in place** (no modal, no new chat), and resend. A clean fork restarts from the turn before your question: `history + edited question + new answer`.
- **🔄 Regenerate** — hover any assistant reply and regenerate it from the turn before. The old question is **not** duplicated into context.
- **<i/N> Version pager** — every message whose turn was regenerated or edited gets a deepseek.com-style `<2/5>` pager (tree model: **each message's versions are counted independently**). Flip through versions with the chevrons; the same turn is scrolled into view. The version you were viewing is remembered per conversation, so switching chats and coming back does not throw you to version 1.
- **🌳 Fork the whole tree** — "Branch in a new conversation" (in-chat or sidebar) copies the WHOLE tree into a fully independent copy: a new root plus a copy of every version, with its own complete version system (`<i/N>` pager works), never interacting with the source again. The copy root is titled `base (副本)` / `(副本 2)` etc., and the new tree opens at the version you forked FROM. **Every** independent copy created by the sidebar or in-chat fork action (including plain single-session forks outside any version family) carries the `(副本)` marker — the sidebar's tell that distinguishes an independent copy from a regenerate/edit version, so a new copy always shows up as its own row and is never folded away.
- **🗑️ Delete session** (patch) — delete a session from the sidebar context menu, including its on-disk log.

The sidebar stays clean: version forks are folded into their original conversation (one row per conversation), and activity inside any version still floats that conversation to the top. **Family-ROOT rows** act on the whole tree for rename/archive/delete (all regenerate/edit versions); fork copies are fully independent conversations that only ever act on themselves.

## ⚠ Requires 2 source patches

Unlike pure plugins, this one extends two harness **source files** that have no public extension points:

| Patch | Files | What it adds |
|---|---|---|
| `ui-conversation` user-actions slot | 5 files | the ✏️ button seat under user messages + the in-place edit anchor (`position: relative`) + in-chat "branch" copies the whole tree |
| `ui-workspace` version-fork folding | 4 files | hide version forks from the sidebar (always), alias the open fork to its original row, fold fork activity into the conversation's recency, restore the last-viewed version, family-wide row actions, sidebar fork copies the whole tree |

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
- The plugin records forks in a localStorage version tree (`dsh-webchatlike:version-tree`, namespaced by family ROOT — each tree gets its own namespace, so forked copies never collide with the source), and the "last viewed version" map (`dsh-webchatlike:last-version`). Reads are fully defensive: without the plugin the sidebar behaves exactly as stock.
- The version pager renders on **every** versioned message; switching opens the sibling fork and scrolls the same turn into view. `seedLength` is not used — no host changes needed for versioning.

## FAQ

**Why are there no buttons on the very first message of a conversation?** The first turn has no clean fork boundary before it (the harness fork needs a completed turn to anchor to), so regenerate/edit are unavailable there — same as the first message in most web chats.

## Relationship to upstream

- The plugin itself uses only harness **public extension points** (`conversation.chat.assistant-actions` / `conversation.chat.user-actions` slots, `ctx.sessions.fork`, `session.prompt`, `ctx.sessions.open`).
- The two patches are small, self-contained core changes (9 files total). Re-apply after upstream updates — `apply-patches.sh` diffs and asks before overwriting.

## License

MIT
