import type {Node} from "web-tree-sitter"

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

export interface Text {
    readonly $: "Text"
    readonly value: string
}

export const text = (value: string): Doc => ({
    $: "Text",
    value,
})

export interface Line {
    readonly $: "Line"
}

export const line = (): Doc => ({
    $: "Line",
})

export interface SoftLine {
    readonly $: "SoftLine"
}

export const softLine = (): Doc => ({
    $: "SoftLine",
})

export interface HardLine {
    readonly $: "HardLine"
}

export const hardLine = (): Doc => ({
    $: "HardLine",
})

export interface LineSuffix {
    readonly $: "LineSuffix"
    readonly suffix: Doc
}

export const lineSuffix = (suffix: Doc): Doc => ({
    $: "LineSuffix",
    suffix,
})

export interface BreakParent {
    readonly $: "BreakParent"
}

export const breakParent = (): Doc => ({
    $: "BreakParent",
})

export interface IfBreak {
    readonly $: "IfBreak"
    readonly breakContent: Doc | undefined
    readonly flatContent: Doc | undefined
}

export const ifBreak = (
    breakContent: Doc | undefined,
    flatContent: Doc | undefined = undefined,
): Doc => ({
    $: "IfBreak",
    breakContent,
    flatContent,
})

export interface Indent {
    readonly $: "Indent"
    readonly indent: number
    readonly content: Doc
}

export const indent = (content: Doc): Doc => ({
    $: "Indent",
    indent: 4,
    content,
})

export interface Group {
    readonly $: "Group"
    readonly content: Doc
}

export const group = (content: Doc[]): Doc => ({
    $: "Group",
    content: concat(content),
})

export interface Concat {
    readonly $: "Concat"
    readonly parts: Doc[]
}

export const concat = (parts: Doc[]): Doc => ({
    $: "Concat",
    parts,
})

export interface Empty {
    readonly $: "Empty"
}

export const empty = (): Doc => ({
    $: "Empty",
})

export function blankLinesBetween(a: Node, b: Node): number {
    const raw = b.startPosition.row - a.endPosition.row - 1
    return Math.max(0, raw)
}

export const blank = (n: number): Doc => (n === 0 ? hardLine() : concat([hardLine(), hardLine()]))
