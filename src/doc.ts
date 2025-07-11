export type Doc = Text | Line | SoftLine | HardLine | Indent | Group | Concat | LineSuffix | BreakParent | IfBreak | Empty

export type Text = {
    $: "Text"
    value: string
}

export const text = (value: string): Doc => ({
    $: "Text",
    value,
})

export type Line = {
    $: "Line"
}

export const line = (): Doc => ({
    $: "Line",
})

export type SoftLine = {
    $: "SoftLine"
}

export const softLine = (): Doc => ({
    $: "SoftLine",
})

export type HardLine = {
    $: "HardLine"
}

export const hardLine = (): Doc => ({
    $: "HardLine",
})

export type LineSuffix = {
    $: "LineSuffix"
    suffix: Doc
}

export const lineSuffix = (suffix: Doc): Doc => ({
    $: "LineSuffix",
    suffix,
})

export type BreakParent = {
    $: "BreakParent"
}

export const breakParent = (): Doc => ({
    $: "BreakParent",
})

export type IfBreak = {
    $: "IfBreak"
    breakContent: Doc | undefined
    flatContent: Doc | undefined
}

export const ifBreak = (breakContent: Doc | undefined, flatContent: Doc | undefined): Doc => ({
    $: "IfBreak",
    breakContent,
    flatContent,
})


export type Indent = {
    $: "Indent"
    indent: number
    content: Doc
}

export const indent = (content: Doc): Doc => ({
    $: "Indent",
    indent: 4,
    content,
})

export type Group = {
    $: "Group"
    content: Doc
}

export const group = (content: Doc[]): Doc => ({
    $: "Group",
    content: concat(content),
})

export type Concat = {
    $: "Concat"
    parts: Doc[]
}

export const concat = (parts: Doc[]): Doc => ({
    $: "Concat",
    parts,
})

export type Empty = {
    $: "Empty"
}

export const empty = (): Doc => ({
    $: "Empty",
})
