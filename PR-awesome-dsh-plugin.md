# awesome-dsh-plugin 收录 PR 文案

提交 PR 到 https://github.com/awesome-dsh-plugin/awesome-dsh-plugin (PRs welcome)。
把 `cindyguyuehu123` 换成你的 GitHub 用户名。两个文件都要改,各加一行。

## README.md (English) — under `### Sessions & Messages`

```markdown
- [cindyguyuehu123/dsh-webchatlike](https://github.com/cindyguyuehu123/dsh-webchatlike) - deepseek.com web/app chat experience for DSH: edit your prompt and regenerate answers in place, with a per-message <i/N> version pager (tree model, stable across conversations).
```

## README.zh.md (中文) — 在 `### 💬 会话与消息` 下

```markdown
- [cindyguyuehu123/dsh-webchatlike](https://github.com/cindyguyuehu123/dsh-webchatlike) — 更贴近 deepseek 网页版/App 的聊天体验：原位编辑提问、重新生成回复、每条消息带 <i/N> 版本翻页器（树状版本模型，跨对话保持稳定）。
```

## PR 标题

```
add dsh-webchatlike: web-chat style message actions (edit-and-resend, regenerate, version pager)
```

## PR 描述(可复制)

```markdown
Adds [dsh-webchatlike](https://github.com/cindyguyuehu123/dsh-webchatlike) to **Sessions & Messages**.

Brings the deepseek.com web/app chat experience to the DeepSeek Harness Web GUI:

- ✏️ edit-and-resend your own message **in place** (no modal), forking cleanly before that turn;
- 🔄 regenerate any assistant reply from the turn before (no question duplication);
- a deepseek.com-style `<i/N>` version pager on **every** versioned message (tree model — each message's versions are counted independently), with per-conversation last-viewed-version restore;
- version forks are folded in the sidebar (one row per conversation) and activity inside any version still floats the conversation.

Note: unlike pure plugins it ships with a small source-patch layer (`apply-patches.sh`, 6 files) for two harness surfaces that have no public extension points (ui-conversation user-actions slot + ui-workspace version folding); the plugin itself is installable via `dsh plugin --profile web add` (declares `dsh.bundle`).

Repo topic `dsh-plugin` is set.
```
