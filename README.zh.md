# dsh-webchatlike

> 把 **DeepSeek 网页版 / App 的聊天体验**带进 DeepSeek Harness：编辑提问、重新生成回复、在消息上直接翻版本——就像在 deepseek.com 上聊天一样。

![MIT](https://img.shields.io/badge/license-MIT-blue) ![DSH plugin](https://img.shields.io/badge/dsh-plugin-4f7cf7)

一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI 的客户端插件,让对话行为和 deepseek.com 网页版 / App 一致:原位编辑、一键重新生成、逐条消息的版本翻页器。

- **✏️ 编辑重发**——悬停**自己的消息**,在原消息位置**就地**打开编辑框(预填原提问,无弹窗、不新建对话),改完重发。fork 点选在提问回合之前,新会话是干净的 `历史 + 修改后的提问 + 新回答`。
- **🔄 重新生成**——悬停任意 assistant 回复,从该回合之前分叉重新生成。旧提问**不会**重复塞进上下文。
- **<i/N> 版本翻页**——**每条**被重新生成 / 编辑重发过的消息旁都会出现 deepseek.com 风格的 `<2/5>` 翻页器(树状模型:**每条消息的版本独立计数**)。左右箭头切换版本,自动定位到同一轮。每个对话记住你最后查看的版本——切去别的对话再回来,不会跳回第 1 版。
- **🗑️ 删除会话**(需补丁)——从左侧会话菜单彻底删除会话,连同硬盘上的会话日志。

边栏保持干净:版本 fork 折叠进原始对话(一个对话一行),在任意版本里的活动都会照常把该对话浮到顶部。

## ⚠ 依赖 2 个源码补丁

与纯插件不同,本插件扩展了两个 harness **没有公开扩展点**的源码文件:

| 补丁 | 文件数 | 作用 |
|---|---|---|
| ui-conversation user-actions 插槽 | 4 | 用户消息下方的 ✏️ 按钮座位 + 原位编辑锚点(`position: relative`) |
| ui-workspace 版本折叠 | 2 | 边栏永远隐藏版本 fork、当前版本映射回原始行、版本内活动折算进对话排序、恢复最后查看的版本 |

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
- 插件把 fork 记录在 localStorage 版本树(`dsh-webchatlike:version-tree`,以回合的 fork 边界为键)和「最后查看版本」映射(`dsh-webchatlike:last-version`)里。所有读取都是防御式的:没有插件时,边栏行为与原生完全一致。
- 版本翻页器渲染在**每条**版本化消息上;切换打开兄弟 fork 并滚动定位到同一轮。不依赖 `seedLength`——版本功能不需要任何 host 改动。

## FAQ

**为什么对话的第一条消息没有按钮?** 第一回合之前没有干净的 fork 边界(harness 的 fork 需要一个已完成的回合作为锚点),所以第一条消息不能重新生成 / 编辑——和大多数网页版聊天一致。

## 与上游的关系

- 插件本身只用 harness **公开扩展点**(`conversation.chat.assistant-actions` / `conversation.chat.user-actions` 插槽、`ctx.sessions.fork`、`session.prompt`、`ctx.sessions.open`)。
- 两个补丁是小而自洽的核心改动(共 6 个文件)。上游更新后重新应用即可——`apply-patches.sh` 会先对比再覆盖。

## License

MIT
