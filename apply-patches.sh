#!/usr/bin/env bash
#
# apply-patches.sh — 应用 dsh-webchatlike 补丁到 DeepSeek Harness checkout
# （ui-conversation user-actions 插槽 + 删除会话）
#
# 用法:
#   ./apply-patches.sh                 # 应用到当前目录（默认）
#   ./apply-patches.sh /path/to/harness
#   ./apply-patches.sh -y /path/to/harness  # 跳过冲突确认
#
# 覆盖前会对比目标文件；若上游已改动同一文件，列出差异并请求确认。
# 应用后需要重建并重启：
#   pnpm run build:lib && pnpm run build:web && pnpm dsh web

set -u

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$REPO_DIR/patches"
TARGET="${1:-$(pwd)}"
AUTO=0
if [ "${1:-}" = "-y" ]; then AUTO=1; TARGET="${2:-$(pwd)}"; fi

if [ ! -d "$SRC" ]; then
  echo "错误: 找不到补丁目录 $SRC" >&2
  exit 1
fi
if [ ! -d "$TARGET/packages" ]; then
  echo "错误: 目标目录 $TARGET 不是 harness checkout（无 packages/）" >&2
  exit 1
fi

CHANGED=0
CONFLICT=0
while IFS= read -r -d '' rel; do
  from="$SRC/$rel"
  to="$TARGET/$rel"
  [ -f "$from" ] || continue
  CHANGED=$((CHANGED + 1))
  if [ -f "$to" ] && ! cmp -s "$from" "$to"; then
    CONFLICT=$((CONFLICT + 1))
    echo "⚠  $rel"
    echo "   目标文件与补丁不一致（上游可能改过或此前有改动）:"
    diff <(cat "$to") <(cat "$from") | head -6 | sed 's/^/   | /'
    if [ "$AUTO" -ne 1 ]; then
      read -r -p "    覆盖此文件? [y/N] " ans
      if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
        echo "    跳过 $rel"
        continue
      fi
    fi
  fi
  mkdir -p "$(dirname "$to")"
  cp "$from" "$to"
done < <(cd "$SRC" && find . -type f -print0 | sed 's|^\./||')

echo ""
echo "已处理 $CHANGED 个补丁文件, 其中 $CONFLICT 个与目标不一致（见上）。"
echo "下一步（在 $TARGET 下）: pnpm run build:lib && pnpm run build:web && pnpm dsh web"
