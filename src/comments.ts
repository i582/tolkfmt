import {Node} from "web-tree-sitter";

export interface CommentInfo {
    readonly node: Node;
    readonly start: number;
    readonly end: number;
    readonly startRow: number;
    readonly endRow: number;
    readonly text: string;
}

export interface Bound {
    leading: CommentInfo[];
    trailing: CommentInfo[];
    dangling: CommentInfo[];
}

export type CommentMap = Map<number /* node.id */, Bound>;

export function bindComments(root: Node): CommentMap {
    const comments = collectComments(root);
    const byNode: CommentMap = new Map();

    const nodes = collectNamedNodes(root);

    let ci = 0;

    for (const node of nodes) {
        while (ci < comments.length && comments[ci].end <= node.startIndex) {
            attachLeading(comments[ci++], node, byNode);
        }

        while (
            ci < comments.length &&
            comments[ci].start >= node.endIndex &&
            comments[ci].startRow === node.endPosition.row
            ) {
            attachTrailing(comments[ci++], node, byNode);
        }

        while (
            ci < comments.length &&
            comments[ci].start > node.startIndex &&
            comments[ci].end < node.endIndex &&
            !isInsideChild(comments[ci].node, node)
            ) {
            attachDangling(comments[ci++], node, byNode);
        }
    }

    while (ci < comments.length) {
        attachTrailing(comments[ci++], root, byNode);
    }

    return byNode;
}

export function takeLeading(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id);
    if (!entry) return [];
    const out = entry.leading;
    entry.leading = [];
    return out;
}

export function takeTrailing(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id);
    if (!entry) return [];
    const out = entry.trailing;
    entry.trailing = [];
    return out;
}

export function takeDangling(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id);
    if (!entry) return [];
    const out = entry.dangling;
    entry.dangling = [];
    return out;
}

function dfs(n: Node, cb: (n: Node) => void) {
    cb(n);
    for (const child of n.namedChildren) {
        if (!child) continue
        dfs(child, cb);
    }
}

function collectComments(root: Node): CommentInfo[] {
    const out: CommentInfo[] = [];
    dfs(root, (n) => {
        if (n.type === "comment") {
            out.push({
                node: n,
                text: n.text,
                start: n.startIndex,
                end: n.endIndex,
                startRow: n.startPosition.row,
                endRow: n.endPosition.row,
            });
        }
    });
    return out.sort((a, b) => a.start - b.start);
}

function collectNamedNodes(root: Node): Node[] {
    const res: Node[] = [];
    dfs(root, (n) => {
        if (n.isNamed && n.type !== "comment") res.push(n);
    });
    return res.sort((a, b) => a.startIndex - b.startIndex);
}

function ensureEntry(n: Node, map: CommentMap): Bound {
    let e = map.get(n.id);
    if (!e) {
        e = {leading: [], trailing: [], dangling: []};
        map.set(n.id, e);
    }
    return e;
}

function attachLeading(c: CommentInfo, node: Node, map: CommentMap) {
    ensureEntry(node, map).leading.push(c);
}

function attachTrailing(c: CommentInfo, node: Node, map: CommentMap) {
    // console.log(`attach trailing ${c.text} to ${node.text}`)
    ensureEntry(node, map).trailing.push(c);
}

function attachDangling(c: CommentInfo, node: Node, map: CommentMap) {
    ensureEntry(node, map).dangling.push(c);
}

function isInsideChild(comment: Node, parent: Node): boolean {
    for (const child of parent.namedChildren) {
        if (!child) continue
        if (child.startIndex <= comment.startIndex && child.endIndex >= comment.endIndex) {
            return true;
        }
    }
    return false;
}
