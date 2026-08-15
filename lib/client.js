window.__ModuleLoader__.load({
	id: "dsh-webchatlike",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/fork-boundary.js
		/** Plain-text user prompt of one turn ('' for steering-only turns). */
		function userPromptOfTurn(snapshot, turn) {
			for (const key of snapshot.chat.locations.getTurn(turn)) {
				const n = snapshot.chat.nodes.get(key);
				if (n?.kind === "user") return (n.data.content ?? []).filter((block) => block.type === "text" && typeof block.text === "string").map((block) => block.text).join("");
			}
			return "";
		}
		/**
		* The fork `atSeq` that excludes `turn` from the new session: the previous
		* completed turn's `turn/end` seq. `undefined` for the first turn (no clean
		* cut point — the action should be unavailable then).
		*/
		function forkSeqBeforeTurn(snapshot, turn) {
			const { turnOrder, turns } = snapshot.chat.timeline;
			const index = turnOrder.indexOf(turn);
			if (index <= 0) return void 0;
			const previousKey = turnOrder[index - 1];
			if (previousKey === void 0) return void 0;
			return (turns.get(previousKey)?.end)?.seq;
		}
		//#endregion
		//#region \0dsh-css:/Users/cynthiababy/deepseek-harness/packages/client/chat-actions/src/client/styles.module.css.mjs
		const css = ".CWB8Ta_actions{align-items:center;gap:2px;margin-left:2px;display:inline-flex}.CWB8Ta_action{width:24px;height:24px;color:var(--dsw-alias-icon-tertiary,#9ca3af);cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;padding:0;display:inline-flex}.CWB8Ta_action:hover{background:var(--dsw-alias-surface-hover,#80808026);color:var(--dsw-alias-icon-secondary,#6b7280)}.CWB8Ta_pager{background:var(--dsw-alias-interactive-bg-hover,#8080801f);border-radius:6px;align-items:center;gap:1px;margin:0 2px;padding:0 4px;display:inline-flex}.CWB8Ta_pagerButton{width:18px;height:20px;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;display:inline-flex}.CWB8Ta_pagerButton:hover:not(:disabled){background:var(--dsw-alias-surface-hover,#80808033);color:var(--dsw-alias-label-primary,#111827)}.CWB8Ta_pagerButton:disabled{color:var(--dsw-alias-label-tertiary,#9ca3af);cursor:default}.CWB8Ta_pagerLabel{text-align:center;font-variant-numeric:tabular-nums;min-width:28px;color:var(--dsw-alias-label-secondary,#6b7280);user-select:none;font-size:11px;line-height:20px}.CWB8Ta_editPanel{z-index:10;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#80808059);background:var(--dsw-specific-input-major,#fff);width:min(525px,82%);min-height:100%;box-shadow:var(--dsw-shadow-lv2,0 4px 16px #0000001f);color:var(--dsw-alias-label-primary,#111827);border-radius:18px;flex-direction:column;align-items:stretch;gap:8px;margin-left:auto;padding:10px 14px;display:flex;position:absolute;top:0;left:0;right:0}.CWB8Ta_editPanel:focus-within{border-color:var(--dsw-alias-button-info-fill,#4f7cf7)}.CWB8Ta_editor{resize:none;width:100%;min-height:88px;max-height:40vh;color:inherit;font:inherit;background:0 0;border:none;outline:none;flex:auto;padding:0;font-size:16px;line-height:24px;overflow-y:auto}.CWB8Ta_editFooter{justify-content:flex-end;align-items:center;gap:8px;display:flex}.CWB8Ta_status{color:var(--dsw-alias-text-tertiary,#9ca3af);font-size:12px}";
		const tagId = "dsh-webchatlike/styles.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-webchatlike";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var styles_module_css_default = {
			"actions": "CWB8Ta_actions",
			"editFooter": "CWB8Ta_editFooter",
			"status": "CWB8Ta_status",
			"pager": "CWB8Ta_pager",
			"pagerButton": "CWB8Ta_pagerButton",
			"action": "CWB8Ta_action",
			"pagerLabel": "CWB8Ta_pagerLabel",
			"editPanel": "CWB8Ta_editPanel",
			"editor": "CWB8Ta_editor"
		};
		//#endregion
		//#region lib/types/client/EditDialog.js
		/**
		* In-place edit-and-resend panel: replaces the user message bubble with an
		* anchored editor (composer-style card) while editing, mirroring the
		* web-chat in-place editing feel — no modal, no full-screen dim.
		*
		* The overlay anchors to the message row: the ui-conversation user-actions
		* patch gives `.userRow` `position: relative`, so this panel can pin itself
		* with `inset: 0` over exactly that row (bubble + icon strip).
		* @module dsh-webchatlike/client/edit-dialog
		*/
		/**
		* The in-place prompt editor for edit-and-resend.
		* @param props - seed text, busy flag, locale seat, cancel/confirm callbacks.
		*/
		function EditDialog({ initial, busy, t, onCancel, onConfirm }) {
			const [draft, setDraft] = (0, react.useState)(initial);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: styles_module_css_default.editPanel,
				role: "group",
				"aria-label": t("edit.title"),
				children: [(0, react_jsx_runtime.jsx)("textarea", {
					className: styles_module_css_default.editor,
					value: draft,
					"aria-label": t("edit.title"),
					autoFocus: true,
					disabled: busy,
					onChange: (event) => {
						setDraft(event.target.value);
					},
					onKeyDown: (event) => {
						if (event.key === "Escape" && !busy) onCancel();
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							if (draft.trim() !== "" && !busy) onConfirm(draft);
						}
					}
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: styles_module_css_default.editFooter,
					children: [
						busy && (0, react_jsx_runtime.jsxs)("span", {
							className: styles_module_css_default.status,
							children: [t("regenerate"), "…"]
						}),
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							disabled: busy,
							onClick: onCancel,
							children: t("edit.cancel")
						}),
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							size: "sm",
							icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {}),
							disabled: busy || draft.trim() === "",
							onClick: () => {
								onConfirm(draft);
							},
							children: t("edit.confirm")
						})
					]
				})]
			});
		}
		//#endregion
		//#region lib/types/client/ChatActions.js
		/**
		* The chat-actions entries: regenerate (assistant strip) and edit-and-resend
		* (user strip), plus the edit-and-resend dialog.
		*
		* Both actions fork the session before the target turn via the injected
		* `forkAndReplay` verb: the inherited history carries no duplicate prompt,
		* and the (edited) prompt is queued into the fresh child session.
		* @module dsh-chat-actions/client/actions
		*/
		/**
		* Resolve fork point + prompt for the turn holding `node`. `undefined` when
		* the turn is not cleanly cuttable (first turn) or has no text to replay.
		*/
		function targetOfTurn(snapshot, node) {
			const turn = node.location.kind === "turn" || node.location.kind === "step" ? node.location.turn?.turn : void 0;
			if (turn === void 0) return void 0;
			const forkSeq = forkSeqBeforeTurn(snapshot, turn);
			if (forkSeq === void 0) return void 0;
			const prompt = userPromptOfTurn(snapshot, turn);
			return prompt === "" ? void 0 : {
				forkSeq,
				prompt
			};
		}
		/** Shared inline icon-button chrome. */
		function IconButton({ label, busy, onClick, children }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				side: "top",
				children: (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: styles_module_css_default.action,
					"aria-label": label,
					disabled: busy,
					onClick,
					children
				})
			});
		}
		/**
		* Regenerate entry for one finalized assistant message (assistant strip).
		* @param props - the owner\'s message identity, session kit, injected verb, and copy.
		*/
		function RegenerateActions({ messageId, useSession, forkAndReplay, t }) {
			const target = useSession((snapshot) => {
				for (const key of snapshot.chat.order) {
					const n = snapshot.chat.nodes.get(key);
					if (n === void 0) continue;
					if (n.data.finalNode?.messageId !== messageId) continue;
					return targetOfTurn(snapshot, n);
				}
			});
			const [busy, setBusy] = (0, react.useState)(false);
			if (target === void 0) return null;
			return (0, react_jsx_runtime.jsx)("span", {
				className: styles_module_css_default.actions,
				children: (0, react_jsx_runtime.jsx)(IconButton, {
					label: t("regenerate"),
					busy,
					onClick: () => {
						setBusy(true);
						forkAndReplay(target.forkSeq, target.prompt).finally(() => setBusy(false));
					},
					children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, {})
				})
			});
		}
		/**
		* Edit-and-resend entry for one finalized user message (user strip).
		* @param props - the owner\'s message seq, session kit, injected verb, and copy.
		*/
		function EditAction({ messageSeq, useSession, forkAndReplay, t }) {
			const target = useSession((snapshot) => {
				for (const key of snapshot.chat.order) {
					const n = snapshot.chat.nodes.get(key);
					if (n === void 0 || n.kind !== "user") continue;
					if (n.data.seq !== messageSeq) continue;
					return targetOfTurn(snapshot, n);
				}
			});
			const [editing, setEditing] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			if (target === void 0) return null;
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
				className: styles_module_css_default.actions,
				children: (0, react_jsx_runtime.jsx)(IconButton, {
					label: t("edit"),
					busy,
					onClick: () => {
						setEditing(true);
					},
					children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {})
				})
			}), editing && (0, react_jsx_runtime.jsx)(EditDialog, {
				initial: target.prompt,
				busy,
				t,
				onCancel: () => {
					setEditing(false);
				},
				onConfirm: (text) => {
					setBusy(true);
					forkAndReplay(target.forkSeq, text).finally(() => {
						setBusy(false);
						setEditing(false);
					});
				}
			})] });
		}
		//#endregion
		//#region lib/types/client/VersionPager.js
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
		/** localStorage key of the version tree (`{ [atSeq]: { original, versions } }`). */
		const VERSION_TREE_KEY = "dsh-webchatlike:version-tree";
		/** localStorage key of the last-viewed-version map (`{ [original]: sessionId }`). */
		const LAST_VERSION_KEY = "dsh-webchatlike:last-version";
		/**
		* Record the version session the user last viewed in the conversation of
		* `rootOriginalId` (the ROOT original session — the first session of the
		* conversation, see {@link versionRootOf}; the original itself for version 1,
		* a fork child otherwise). The sidebar restores it when the conversation's
		* row is opened, so visiting another conversation does not throw this one
		* back to the first version. Writes only on change; storage failures degrade
		* to no record.
		*/
		function recordLastViewedVersion(rootOriginalId, viewedId) {
			try {
				const raw = localStorage.getItem(LAST_VERSION_KEY);
				const parsed = raw === null ? {} : JSON.parse(raw);
				if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return;
				const map = parsed;
				if (map[rootOriginalId] === viewedId) return;
				map[rootOriginalId] = viewedId;
				localStorage.setItem(LAST_VERSION_KEY, JSON.stringify(map));
			} catch {}
		}
		/**
		* ROOT original session of a version fork: forks can themselves be forked
		* (regenerate/edit inside a version), so the chain is walked until the first
		* session of the conversation. Returns the session itself when it is not a
		* recorded fork. Never throws.
		*/
		function versionRootOf(sessionId) {
			const tree = readVersionTreeByRoot();
			const forkOriginal = /* @__PURE__ */ new Map();
			for (const turns of Object.values(tree)) for (const entry of Object.values(turns)) for (const version of entry.versions) forkOriginal.set(version, entry.original);
			let cursor = sessionId;
			const seen = /* @__PURE__ */ new Set();
			while (cursor !== void 0 && !seen.has(cursor)) {
				seen.add(cursor);
				const parent = forkOriginal.get(cursor);
				if (parent === void 0) return cursor === sessionId ? sessionId : cursor;
				cursor = parent;
			}
			return sessionId;
		}
		/**
		* Read the version tree, namespaced by family ROOT session:
		* `{ [rootId]: { [atSeq]: VersionTree } }`. A forked copy of a whole tree
		* (the sidebar fork action) shares the SAME atSeq fingerprints as its source
		* (the history is copied verbatim), so the atSeq key alone is no longer
		* unique — the root namespace keeps every tree's versions apart. Legacy
		* shapes (v1 flat `childId: parentId`, v2 `childId: {parentId,atSeq,time}`,
		* v3 flat `{ [atSeq]: { original, versions } }`) migrate into the namespaced
		* shape on read; the store is rewritten only when a recordVersionFork lands.
		* Corrupt/missing data degrades to empty; never throws.
		*/
		function readVersionTreeByRoot() {
			let raw = null;
			try {
				raw = typeof localStorage === "undefined" ? null : localStorage.getItem(VERSION_TREE_KEY);
			} catch {
				return {};
			}
			if (raw === null) return {};
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return {};
			}
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
			const parsedObj = parsed;
			if (Object.keys(parsedObj).some((key) => !/^\d+$/.test(key))) {
				const tree = {};
				for (const [rootKey, value] of Object.entries(parsedObj)) {
					if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
					const turns = {};
					for (const [atSeqKey, v] of Object.entries(value)) {
						const t = v;
						if (t === null || typeof t !== "object" || typeof t.original !== "string" || !Array.isArray(t.versions)) continue;
						turns[atSeqKey] = {
							original: t.original,
							versions: t.versions.filter((x) => typeof x === "string"),
							times: typeof t.times === "object" && t.times !== null ? t.times : {}
						};
					}
					if (Object.keys(turns).length > 0) tree[rootKey] = turns;
				}
				return tree;
			}
			const flatTree = {};
			for (const [atSeqKey, value] of Object.entries(parsedObj)) {
				const t = value;
				if (t === null || typeof t !== "object" || typeof t.original !== "string" || !Array.isArray(t.versions)) continue;
				flatTree[atSeqKey] = {
					original: t.original,
					versions: t.versions.filter((x) => typeof x === "string"),
					times: typeof t.times === "object" && t.times !== null ? t.times : {}
				};
			}
			if (Object.keys(flatTree).length > 0) return namespaceFlatTree(flatTree);
			const byTurn = /* @__PURE__ */ new Map();
			for (const [childId, value] of Object.entries(parsedObj)) {
				let parentId;
				let atSeq;
				let time = 0;
				if (typeof value === "string") {
					parentId = value;
					atSeq = -1;
				} else if (typeof value === "object" && value !== null) {
					const e = value;
					if (typeof e.parentId === "string" && typeof e.atSeq === "number") {
						parentId = e.parentId;
						atSeq = e.atSeq;
						if (typeof e.time === "number") time = e.time;
					}
				}
				if (parentId === void 0 || atSeq === void 0 || atSeq < 0) continue;
				const list = byTurn.get(String(atSeq)) ?? [];
				list.push({
					parentId,
					childId,
					time
				});
				byTurn.set(String(atSeq), list);
			}
			const rebuilt = {};
			for (const [atSeqKey, list] of byTurn) {
				list.sort((a, b) => a.time - b.time || (a.childId < b.childId ? -1 : 1));
				const original = list[0]?.parentId;
				if (original === void 0) continue;
				rebuilt[atSeqKey] = {
					original,
					versions: list.map((entry) => entry.childId),
					times: Object.fromEntries(list.map((entry) => [entry.childId, entry.time]))
				};
			}
			return namespaceFlatTree(rebuilt);
		}
		/** Group flat-tree entries under their chain ROOT original. */
		function namespaceFlatTree(flat) {
			const forkOriginal = /* @__PURE__ */ new Map();
			for (const entry of Object.values(flat)) for (const version of entry.versions) forkOriginal.set(version, entry.original);
			const rootOf = (id) => {
				let cursor = id;
				const seen = /* @__PURE__ */ new Set();
				while (cursor !== void 0 && !seen.has(cursor)) {
					seen.add(cursor);
					const parent = forkOriginal.get(cursor);
					if (parent === void 0) return cursor;
					cursor = parent;
				}
				return id;
			};
			const tree = {};
			for (const [atSeqKey, entry] of Object.entries(flat)) {
				const root = rootOf(entry.original);
				const turns = tree[root] ?? {};
				turns[atSeqKey] = entry;
				tree[root] = turns;
			}
			return tree;
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
		function recordVersionFork(childId, parentId, atSeq) {
			try {
				const tree = readVersionTreeByRoot();
				const root = versionRootOf(parentId);
				const turns = tree[root] ?? {};
				const key = String(atSeq);
				const turn = turns[key] ?? {
					original: parentId,
					versions: [],
					times: {}
				};
				if (!turn.versions.includes(childId)) {
					turn.versions.push(childId);
					turn.times[childId] = Date.now();
				}
				turns[key] = turn;
				tree[root] = turns;
				localStorage.setItem(VERSION_TREE_KEY, JSON.stringify(tree));
			} catch {}
		}
		/**
		* The version family of the logical turn anchored at `atSeq`: the original
		* session plus every recorded fork of this exact turn, oldest first.
		* `undefined` when the turn has no versions.
		* @param byId - the live session list rows keyed by id.
		* @param atSeq - the fork boundary fingerprint of the turn.
		* @returns the ordered family ids, or undefined when there is none.
		*/
		function versionFamilyOf(byId, atSeq, rootId) {
			const turn = readVersionTreeByRoot()[rootId]?.[String(atSeq)];
			if (turn === void 0) return void 0;
			if ([turn.original, ...turn.versions].filter((id) => byId[id] !== void 0).length <= 1) return void 0;
			return [turn.original, ...turn.versions].filter((id) => byId[id] !== void 0).sort((a, b) => {
				if (a === turn.original) return -1;
				if (b === turn.original) return 1;
				return (turn.times[a] ?? 0) - (turn.times[b] ?? 0) || (a < b ? -1 : a > b ? 1 : 0);
			});
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
		function familyIndexOf(family, sessionId, byId) {
			const direct = family.indexOf(sessionId);
			if (direct >= 0) return direct;
			const seen = /* @__PURE__ */ new Set();
			let cursor = sessionId;
			while (cursor !== void 0 && !seen.has(cursor)) {
				seen.add(cursor);
				const index = family.indexOf(cursor);
				if (index >= 0) return index;
				cursor = byId[cursor]?.parentId;
			}
			return -1;
		}
		/** One pending scroll-target request after a version switch. */
		let pendingFocus = null;
		/**
		* Request that the pager for `atSeq` inside `sessionId` scroll into view the
		* next time it renders (called right before `sessions.open`).
		*/
		function requestVersionFocus(sessionId, atSeq) {
			pendingFocus = {
				sessionId,
				atSeq
			};
		}
		/**
		* Version pager entry: `<i/N>` + chevrons on the assistant strip, rendered
		* on EVERY message whose turn has recorded versions. Switching opens the
		* sibling fork and scrolls the same turn into view.
		* @param props - the owner's message identity, the session kit, the injected
		* navigation verb, and the copy.
		*/
		function VersionPager({ messageId, useSession, useSessions, sessionId, openSession, t }) {
			const hostRef = (0, react.useRef)(null);
			const atSeq = useSession((snapshot) => {
				for (const key of snapshot.chat.order) {
					const node = snapshot.chat.nodes.get(key);
					if (node === void 0) continue;
					if (node.data.finalNode?.messageId !== messageId) continue;
					const turn = node.location.kind === "turn" || node.location.kind === "step" ? node.location.turn?.turn : void 0;
					if (turn === void 0) return void 0;
					return forkSeqBeforeTurn(snapshot, turn);
				}
			});
			const byId = useSessions((state) => state.byId);
			const family = (0, react.useMemo)(() => {
				if (atSeq === void 0 || sessionId === void 0) return void 0;
				return versionFamilyOf(byId, atSeq, versionRootOf(sessionId));
			}, [
				byId,
				atSeq,
				sessionId
			]);
			(0, react.useEffect)(() => {
				if (pendingFocus === null || pendingFocus.sessionId !== sessionId || pendingFocus.atSeq !== atSeq) return;
				pendingFocus = null;
				hostRef.current?.scrollIntoView({
					block: "center",
					behavior: "smooth"
				});
			}, [
				sessionId,
				atSeq,
				family
			]);
			if (family === void 0 || sessionId === void 0) return null;
			const index = familyIndexOf(family, sessionId, byId);
			if (index < 0) return null;
			const count = family.length;
			const rootOriginal = versionRootOf(sessionId);
			(0, react.useEffect)(() => {
				recordLastViewedVersion(rootOriginal, sessionId);
			}, [
				rootOriginal,
				sessionId,
				index
			]);
			const prev = index > 0 ? family[index - 1] : void 0;
			const next = index < count - 1 ? family[index + 1] : void 0;
			const switchTo = (target) => {
				if (target === void 0 || atSeq === void 0) return;
				recordLastViewedVersion(rootOriginal, target);
				requestVersionFocus(target, atSeq);
				openSession(target);
			};
			return (0, react_jsx_runtime.jsxs)("span", {
				className: styles_module_css_default.pager,
				ref: hostRef,
				children: [
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: t("version.previous"),
						side: "bottom",
						children: (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: styles_module_css_default.pagerButton,
							"aria-label": t("version.previous"),
							disabled: prev === void 0,
							onClick: () => {
								switchTo(prev);
							},
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
						})
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						className: styles_module_css_default.pagerLabel,
						"aria-live": "polite",
						children: [
							index + 1,
							"/",
							count
						]
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: t("version.next"),
						side: "bottom",
						children: (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: styles_module_css_default.pagerButton,
							"aria-label": t("version.next"),
							disabled: next === void 0,
							onClick: () => {
								switchTo(next);
							},
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
						})
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/**
		* `chat-actions` namespace dictionaries.
		* @module dsh-chat-actions/client/locales
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"regenerate": "重新生成回复",
			"edit": "编辑并重新发送",
			"edit.title": "编辑并重新发送",
			"edit.confirm": "重新发送",
			"edit.cancel": "取消",
			"regenerate.unavailable": "该消息无法重新生成（仅首个回合后的已完成回复可用）",
			"edit.unavailable": "该消息无法编辑（仅首个回合后的消息可用）",
			"version.previous": "上一个版本",
			"version.next": "下一个版本"
		};
		/** English dictionary (keys must match `zh` exactly). */
		const en = {
			"regenerate": "Regenerate response",
			"edit": "Edit and resend",
			"edit.title": "Edit and resend",
			"edit.confirm": "Resend",
			"edit.cancel": "Cancel",
			"regenerate.unavailable": "Cannot regenerate this message (only completed replies after the first turn)",
			"edit.unavailable": "Cannot edit this message (only messages after the first turn)",
			"version.previous": "Previous version",
			"version.next": "Next version"
		};
		//#endregion
		//#region lib/types/client/index.js
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
		/** Dictionary namespace owned by this plugin. */
		const NS = "chat-actions";
		/** Required services: the slot registry, the session navigator, and the copy. */
		const inject = [
			"slots",
			"sessions",
			"locale"
		];
		/**
		* Client plugin body: regenerate on the assistant strip, edit-and-resend on
		* the user strip, and a version pager that flips between the sibling forks
		* of the same turn (web-chat style).
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-webchatlike: dictionaries");
			const forkAndReplayFor = (sessionId) => ({
				forkAndReplay: async (forkSeq, text) => {
					if (text === "") return;
					try {
						const childId = await ctx.sessions.fork({
							sessionId,
							atSeq: forkSeq,
							increaseTitle: true
						});
						recordVersionFork(childId, sessionId, forkSeq);
						ctx.sessions.open(childId);
						const session = ctx.sessions.binding(childId)?.session;
						if (session !== void 0) await session.prompt([{
							type: "text",
							text
						}], "queue");
					} catch (error) {
						console.error("[dsh-webchatlike] fork/replay failed:", error);
					}
				},
				openSession: (target) => {
					ctx.sessions.open(target);
				}
			});
			ctx.slots.inject("conversation.chat.assistant-actions", () => {
				const dispose = ctx.slots.register({
					name: "conversation.chat.assistant-actions",
					id: "chat-actions-version-pager",
					order: 10,
					locale: NS,
					inject: (sessionId) => forkAndReplayFor(sessionId)
				}, VersionPager);
				const regenerate = ctx.slots.register({
					name: "conversation.chat.assistant-actions",
					id: "chat-actions-regenerate",
					order: 20,
					locale: NS,
					inject: (sessionId) => forkAndReplayFor(sessionId)
				}, RegenerateActions);
				return () => {
					dispose();
					regenerate();
				};
			});
			ctx.slots.inject("conversation.chat.user-actions", () => {
				return ctx.slots.register({
					name: "conversation.chat.user-actions",
					id: "chat-actions-edit",
					order: 20,
					locale: NS,
					inject: (sessionId) => forkAndReplayFor(sessionId)
				}, EditAction);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.recordVersionFork = recordVersionFork;
		exports.versionFamilyOf = versionFamilyOf;
		exports.versionRootOf = versionRootOf;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map