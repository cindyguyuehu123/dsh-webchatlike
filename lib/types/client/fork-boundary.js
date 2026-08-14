/** Plain-text user prompt of one turn ('' for steering-only turns). */
export function userPromptOfTurn(snapshot, turn) {
    for (const key of snapshot.chat.locations.getTurn(turn)) {
        const n = snapshot.chat.nodes.get(key);
        if (n?.kind === 'user') {
            const content = n.data.content ?? [];
            return content
                .filter(block => block.type === 'text' && typeof block.text === 'string')
                .map(block => block.text)
                .join('');
        }
    }
    return '';
}
/**
 * The fork `atSeq` that excludes `turn` from the new session: the previous
 * completed turn's `turn/end` seq. `undefined` for the first turn (no clean
 * cut point — the action should be unavailable then).
 */
export function forkSeqBeforeTurn(snapshot, turn) {
    const { turnOrder, turns } = snapshot.chat.timeline;
    const index = turnOrder.indexOf(turn);
    if (index <= 0)
        return undefined;
    const previousKey = turnOrder[index - 1];
    if (previousKey === undefined)
        return undefined;
    const previous = turns.get(previousKey);
    const end = previous?.end;
    return end?.seq;
}
//# sourceMappingURL=fork-boundary.js.map