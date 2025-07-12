import {Node} from "web-tree-sitter";

export type Doc =
    | Text
    | Line
    | SoftLine
    | HardLine
    | Indent
    | Group
    | Concat
    | LineSuffix
    | BreakParent
    | IfBreak
    | Empty

export type Text = {
    readonly $: "Text"
    readonly value: string
}

export const text = (value: string): Doc => ({
    $: "Text",
    value,
})

export type Line = {
    readonly $: "Line"
}

export const line = (): Doc => ({
    $: "Line",
})

export type SoftLine = {
    readonly $: "SoftLine"
}

export const softLine = (): Doc => ({
    $: "SoftLine",
})

export type HardLine = {
    readonly $: "HardLine"
}

export const hardLine = (): Doc => ({
    $: "HardLine",
})

export type LineSuffix = {
    readonly $: "LineSuffix"
    readonly suffix: Doc
}

export const lineSuffix = (suffix: Doc): Doc => ({
    $: "LineSuffix",
    suffix,
})

export type BreakParent = {
    readonly $: "BreakParent"
}

export const breakParent = (): Doc => ({
    $: "BreakParent",
})

export type IfBreak = {
    readonly $: "IfBreak"
    readonly breakContent: Doc | undefined
    readonly flatContent: Doc | undefined
}

export const ifBreak = (breakContent: Doc | undefined, flatContent: Doc | undefined): Doc => ({
    $: "IfBreak",
    breakContent,
    flatContent,
})

export type Indent = {
    readonly $: "Indent"
    readonly indent: number
    readonly content: Doc
}

export const indent = (content: Doc): Doc => ({
    $: "Indent",
    indent: 4,
    content,
})

export type Group = {
    readonly $: "Group"
    readonly content: Doc
}

export const group = (content: Doc[]): Doc => ({
    $: "Group",
    content: concat(content),
})

export type Concat = {
    readonly $: "Concat"
    readonly parts: Doc[]
}

export const concat = (parts: Doc[]): Doc => ({
    $: "Concat",
    parts,
})

export type Empty = {
    readonly $: "Empty"
}

export const empty = (): Doc => ({
    $: "Empty",
})

export function blankLinesBetween(a: Node, b: Node): number {
    const raw = b.startPosition.row - a.endPosition.row - 1;
    return Math.max(0, raw);
}

export const blank = (n: number): Doc =>
    n === 0
        ? hardLine()
        : concat([hardLine(), hardLine()]);
