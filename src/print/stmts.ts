import {Node} from "web-tree-sitter";
import {Ctx} from "./ctx";
import {printNode} from "./node";
import {concat, empty, group, hardLine, indent, softLine, text} from "../doc";
import {takeDangling, takeLeading, takeTrailing} from "../comments";
import {printMatchExpression} from "./expr";

export const printIf = (node: Node, ctx: Ctx) => {
    const conditionN = node.childForFieldName("condition")
    const bodyN = node.childForFieldName("body")

    if (!conditionN || !bodyN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    return group([
        text("if ("),
        indent(concat([
            softLine(),
            condition,
        ])),
        softLine(),
        text(") "),
        body,
    ])
}

export function printSetAssignment(node: Node, ctx: Ctx) {
    const leftN = node.childForFieldName("left")
    const rightN = node.childForFieldName("right")
    const operatorN = node.childForFieldName("operator_name")

    if (!leftN || !rightN || !operatorN) return undefined

    const left = printNode(leftN, ctx) ?? empty()
    const right = printNode(rightN, ctx) ?? empty()
    const operator = operatorN.text

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        left,
        text(" "),
        text(operator),
        text(" "),
        right,
        ...trailing,
    ])
}

export function printBlockStatement(node: Node, ctx: Ctx) {
    const statements = node.namedChildren.filter(it => it !== null)

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );
    const dangling = takeDangling(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    // For empty blocks, return compact format
    if (statements.length === 0 && leading.length === 0 && dangling.length === 0) {
        return text("{}")
    }

    return concat([
        text("{"),
        indent(concat([
            hardLine(),
            ...leading,
            ...statements.map(statement => {
                const leading = takeLeading(statement, ctx.comments).map(c =>
                    concat([hardLine(), text(c.text), hardLine()])
                );

                return concat([...leading, printNode(statement, ctx) ?? empty()]) ?? empty()
            }),
            ...dangling,
        ])),
        hardLine(),
        text("}"),
    ])
}

export function printExpressionStatement(node: Node, ctx: Ctx) {
    const expr = node.firstChild
    if (!expr) return undefined

    return concat([
        printNode(expr, ctx) ?? empty(),
        text(";")
    ])
}

export function printReturnStatement(node: Node, ctx: Ctx) {
    const bodyN = node.childForFieldName("body")

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    if (bodyN) {
        const body = printNode(bodyN, ctx) ?? empty()
        return concat([...leading, text("return "), body, ...trailing])
    } else {
        return concat([...leading, text("return"), ...trailing])
    }
}

export function printBreakStatement(node: Node, ctx: Ctx) {
    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([...leading, text("break"), ...trailing])
}

export function printContinueStatement(node: Node, ctx: Ctx) {
    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([...leading, text("continue"), ...trailing])
}

export function printThrowStatement(node: Node, ctx: Ctx) {
    const exprN = node.firstNamedChild // The expression to throw

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    if (exprN) {
        const expr = printNode(exprN, ctx) ?? empty()
        return concat([...leading, text("throw "), expr, ...trailing])
    } else {
        return concat([...leading, text("throw"), ...trailing])
    }
}

export function printWhileStatement(node: Node, ctx: Ctx) {
    const conditionN = node.childForFieldName("condition")
    const bodyN = node.childForFieldName("body")

    if (!conditionN || !bodyN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    return group([
        ...leading,
        text("while ("),
        indent(concat([
            softLine(),
            condition,
        ])),
        softLine(),
        text(") "),
        body,
    ])
}

export function printDoWhileStatement(node: Node, ctx: Ctx) {
    const conditionN = node.childForFieldName("condition")
    const bodyN = node.childForFieldName("body")

    if (!conditionN || !bodyN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    return group([
        ...leading,
        text("do "),
        body,
        text(" while ("),
        indent(concat([
            softLine(),
            condition,
        ])),
        softLine(),
        text(")"),
    ])
}

export function printRepeatStatement(node: Node, ctx: Ctx) {
    const countN = node.childForFieldName("count")
    const bodyN = node.childForFieldName("body")

    if (!countN || !bodyN) return undefined

    const count = printNode(countN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    return group([
        ...leading,
        text("repeat ("),
        indent(concat([
            softLine(),
            count,
        ])),
        softLine(),
        text(") "),
        body,
    ])
}

export function printLocalVarsDeclaration(node: Node, ctx: Ctx) {
    const kindN = node.childForFieldName("kind")
    const lhsN = node.childForFieldName("lhs")
    const assignedValN = node.childForFieldName("assigned_val")

    if (!kindN || !lhsN) return undefined

    const kind = kindN.text // "var" or "val"
    const lhs = printNode(lhsN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    if (assignedValN) {
        const assignedVal = printNode(assignedValN, ctx) ?? empty()
        return group([
            ...leading,
            text(kind),
            text(" "),
            lhs,
            text(" = "),
            assignedVal,
            ...trailing,
        ])
    } else {
        return group([
            ...leading,
            text(kind),
            text(" "),
            lhs,
            ...trailing,
        ])
    }
}

export function printVarDeclaration(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")
    const redefN = node.childForFieldName("redef")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    if (redefN) {
        return concat([name, text(" redef"), ...trailing])
    } else if (typeN) {
        const type = printNode(typeN, ctx) ?? empty()
        return concat([name, text(": "), type, ...trailing])
    } else {
        return concat([name, ...trailing])
    }
}

export function printTupleVarsDeclaration(node: Node, ctx: Ctx) {
    const varsN = node.childForFieldName("vars")
    if (!varsN) return undefined

    // Extract all vars from the vars field
    const vars = varsN.namedChildren.filter(child => child !== null) as Node[]
    const parts = vars.map(v => printNode(v, ctx) ?? empty())

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    if (parts.length === 1) {
        return concat([text("["), parts[0], text("]"), ...trailing])
    }

    const [first, ...rest] = parts;
    const tailDocs = rest.map(part => concat([text(", "), part]))

    return group([
        text("["),
        indent(concat([
            softLine(),
            first,
            ...tailDocs,
        ])),
        softLine(),
        text("]"),
        ...trailing,
    ])
}

export function printTensorVarsDeclaration(node: Node, ctx: Ctx) {
    const varsN = node.childForFieldName("vars")
    if (!varsN) return undefined

    // Extract all vars from the vars field
    const vars = varsN.namedChildren.filter(child => child !== null) as Node[]
    const parts = vars.map(v => printNode(v, ctx) ?? empty())

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    if (parts.length === 1) {
        return concat([text("("), parts[0], text(")"), ...trailing])
    }

    const [first, ...rest] = parts;
    const tailDocs = rest.map(part => concat([text(", "), part]))

    return group([
        text("("),
        indent(concat([
            softLine(),
            first,
            ...tailDocs,
        ])),
        softLine(),
        text(")"),
        ...trailing,
    ])
}

export function printEmptyStatement(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(";"), ...trailing])
}

export function printAssertStatement(node: Node, ctx: Ctx) {
    const conditionN = node.childForFieldName("condition")
    const excNoN = node.childForFieldName("excNo")

    if (!conditionN || !excNoN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const excNo = printNode(excNoN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    // Check if it's the throw form: assert(...) throw ...
    const hasThrow = node.children.some(child => child?.text === "throw")

    if (hasThrow) {
        return group([
            text("assert("),
            condition,
            text(") throw "),
            excNo,
            ...trailing,
        ])
    } else {
        return group([
            text("assert("),
            condition,
            text(", "),
            excNo,
            text(")"),
            ...trailing,
        ])
    }
}

export function printTryCatchStatement(node: Node, ctx: Ctx) {
    const tryBodyN = node.childForFieldName("try_body")
    const catchN = node.childForFieldName("catch")

    if (!tryBodyN || !catchN) return undefined

    const tryBody = printNode(tryBodyN, ctx) ?? empty()
    const catchClause = printNode(catchN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        text("try "),
        tryBody,
        text(" catch "),
        catchClause,
        ...trailing,
    ])
}

export function printCatchClause(node: Node, ctx: Ctx) {
    const catchBodyN = node.childForFieldName("catch_body")
    const catchVar1N = node.childForFieldName("catch_var1")
    const catchVar2N = node.childForFieldName("catch_var2")

    if (!catchBodyN) return undefined

    const catchBody = printNode(catchBodyN, ctx) ?? empty()
    const catchVar1 = catchVar1N ? printNode(catchVar1N, ctx) ?? empty() : empty()
    const catchVar2 = catchVar2N ? printNode(catchVar2N, ctx) ?? empty() : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    let vars = empty()
    if (catchVar1 !== empty()) {
        if (catchVar2 !== empty()) {
            vars = concat([text("("), catchVar1, text(", "), catchVar2, text(")")])
        } else {
            vars = concat([text("("), catchVar1, text(")")])
        }
    }

    return concat([vars, catchBody, ...trailing])
}

export function printMatchStatement(node: Node, ctx: Ctx) {
    return printMatchExpression(node, ctx)
}

export function printAssignment(node: Node, ctx: Ctx) {
    const leftN = node.childForFieldName("left")
    const rightN = node.childForFieldName("right")

    if (!leftN || !rightN) return undefined

    const left = printNode(leftN, ctx) ?? empty()
    const right = printNode(rightN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([left, text(" = "), right, ...trailing])
}
