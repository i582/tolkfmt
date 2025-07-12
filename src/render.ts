import {Doc, empty} from "./doc"

export function render(doc: Doc, printWidth: number): string {
    type Mode = "flat" | "break"

    interface Frame {
        doc: Doc
        mode: Mode
        indent: number
    }

    const out: string[] = []
    const lineSuffix: Doc[] = []
    const stack: Frame[] = [{doc, mode: "break", indent: 0}]

    function fits(d: Doc, w: number): boolean {
        const fitStack: Doc[] = [d]
        let width = w

        while (width >= 0 && fitStack.length) {
            const cur = fitStack.pop()!
            switch (cur.$) {
                case "Text":
                    width -= cur.value.length
                    break
                case "Line":
                    width -= 1
                    break
                case "SoftLine":
                    break
                case "HardLine":
                    return true
                case "Concat":
                    for (let i = cur.parts.length - 1; i >= 0; i--) {
                        fitStack.push(cur.parts[i])
                    }
                    break
                case "Indent":
                    fitStack.push(cur.content)
                    break
                case "Group":
                    fitStack.push(cur.content)
                    break
                case "LineSuffix":
                    fitStack.push(cur.suffix)
                    break
                case "BreakParent":
                    return true
                case "IfBreak":
                    if (cur.flatContent) {
                        fitStack.push(cur.flatContent)
                    }
                    break
            }
        }
        return width >= 0
    }

    // main loop
    while (stack.length) {
        const {doc: cur, mode, indent} = stack.pop()!

        switch (cur.$) {
            case "Text":
                out.push(cur.value)
                break

            case "Line":
                if (mode === "flat") {
                    out.push(" ")
                } else {
                    flushLineSuffix()
                    out.push("\n")
                    if (indent !== 0) {
                        out.push(" ".repeat(indent))
                    }
                }
                break

            case "SoftLine":
                if (mode !== "flat") {
                    flushLineSuffix()
                    out.push("\n")
                    if (indent !== 0) {
                        out.push(" ".repeat(indent))
                    }
                }
                break

            case "HardLine":
                flushLineSuffix()
                out.push("\n")
                if (indent !== 0) {
                    out.push(" ".repeat(indent))
                }
                break

            case "Concat":
                for (let i = cur.parts.length - 1; i >= 0; i--) {
                    stack.push({doc: cur.parts[i], mode, indent})
                }
                break

            case "Indent":
                stack.push({doc: cur.content, mode, indent: indent + cur.indent})
                break

            case "Group": {
                const shouldFlat = fits(cur.content, printWidth - currentColumn(out))
                stack.push({doc: cur.content, mode: shouldFlat ? "flat" : "break", indent})
                break
            }

            case "LineSuffix":
                lineSuffix.push(cur.suffix)
                break

            case "BreakParent":
                flushLineSuffix()
                out.push("\n")
                if (indent !== 0) {
                    out.push(" ".repeat(indent))
                }
                break

            case "IfBreak":
                stack.push({
                    doc:
                        mode === "break"
                            ? (cur.breakContent ?? empty())
                            : (cur.flatContent ?? empty()),
                    mode,
                    indent,
                })
                break
        }
    }

    return out.join("")

    function currentColumn(buf: string[]): number {
        let col = 0

        for (let i = buf.length - 1; i >= 0; i--) {
            const piece = buf[i]
            const nl = piece.lastIndexOf("\n")

            if (nl !== -1) {
                return col + piece.length - nl - 1
            }
            col += piece.length
        }
        return col
    }

    function flushLineSuffix() {
        while (lineSuffix.length) {
            const suffix = lineSuffix.shift()!
            stack.push({doc: suffix, mode: "flat", indent: 0})
        }
    }
}
