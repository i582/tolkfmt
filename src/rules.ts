import {Node} from "web-tree-sitter";
import {concat, Doc, empty, group, hardLine, indent, line, softLine, text} from "./doc";

export type Ctx = {}

export const printNode = (node: Node, ctx: Ctx): Doc | undefined => {
    if (node.type === "number_literal") {
        return printNumberLiteral(node, ctx)
    }

    if (node.type === "identifier" || node.type === "type_identifier") {
        return text(node.text)
    }

    if (node.type === "dot_access") {
        const qualifierN = node.childForFieldName("obj")
        const fieldN = node.childForFieldName("field")

        if (!qualifierN || !fieldN) return undefined

        const qualifier = printNode(qualifierN, ctx) ?? empty()
        const field = printNode(fieldN, ctx) ?? empty()

        return group([qualifier, indent(concat([softLine(), text("."), field]))])
    }

    if (node.type === "function_call") {
        const calleeN = node.childForFieldName("callee")
        const argumentsN = node.childForFieldName("arguments")

        if (!calleeN || !argumentsN) return undefined

        const callee = printNode(calleeN, ctx) ?? empty()
        const args = empty() // TODO

        return concat([callee, text("("), args, text(")")])
    }

    if (node.type === "binary_operator") {
        const leftN = node.child(0)
        const operatorN = node.childForFieldName("operator_name")
        const rightN = node.child(2)

        if (!leftN || !operatorN || !rightN) return undefined

        const left = printNode(leftN, ctx) ?? empty()
        const right = printNode(rightN, ctx) ?? empty()
        const operator = operatorN.text;

        return group([left, text(" "), text(operator), line(), group([right])])
    }

    if (node.type === "if_statement") {
        return printIf(node, ctx)
    }

    if (node.type === "block_statement") {
        const statements = node.namedChildren.filter(it => it !== null)

        return concat([
            text("{"),
            indent(concat([
                hardLine(),
                ...statements.map(statement => printNode(statement, ctx) ?? empty()),
            ])),
            hardLine(),
            text("}"),
        ])
    }

    if (node.type === "expression_statement") {
        const expr = node.firstChild
        if (!expr) return undefined

        return concat([
            printNode(expr, ctx) ?? empty(),
            text(";")
        ])
    }

    return undefined
}

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

export const printNumberLiteral = (node: Node, _ctx: Ctx) => {
    return text(node.text)
}
