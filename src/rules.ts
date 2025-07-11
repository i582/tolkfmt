import {Node} from "web-tree-sitter";
import {concat, Doc, empty, group, hardLine, ifBreak, indent, line, softLine, text} from "./doc";
import {CommentMap, takeDangling, takeLeading, takeTrailing} from "./comments";

export type Ctx = {
    readonly comments: CommentMap;
}

function printTypeAlias(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("underlying_type")

    if (!nameN || !typeN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    const name = text(nameN.text)
    const type = printNode(typeN, ctx) ?? empty()

    return group([
        ...leading,
        text("type"),
        text(" "),
        name,
        text(" = "),
        type,
        ...trailing,
    ])
}

function printFunction(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const bodyN = node.childForFieldName("body")

    if (!nameN || !bodyN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const name = text(nameN.text)
    const body = printNode(bodyN, ctx) ?? empty()

    return group([
        ...leading,
        text("fun "),
        name,
        text("()"),
        text(" "),
        body,
    ])
}

function printUnionType(node: Node, ctx: Ctx) {
    const parts = unionTypeParts(node).map(it => printNode(it, ctx) ?? empty())

    const [first, ...rest] = parts;

    const firstDoc = concat([
        ifBreak(text("| "), undefined),
        first
    ]);

    const tailDocs = rest.map(v =>
        concat([line(), text("| "), v])
    );

    return group([
        indent(
            concat([
                softLine(),
                firstDoc,
                ...tailDocs,
            ])
        )
    ])
}

function printDotAccess(node: Node, ctx: Ctx) {
    const qualifierN = node.childForFieldName("obj")
    const fieldN = node.childForFieldName("field")

    if (!qualifierN || !fieldN) return undefined

    const qualifier = printNode(qualifierN, ctx) ?? empty()
    const field = printNode(fieldN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        qualifier,
        indent(concat([
            softLine(),
            text("."),
            field,
            ...trailing
        ])),
    ])
}

function printFunctionCall(node: Node, ctx: Ctx) {
    const calleeN = node.childForFieldName("callee")
    const argumentsN = node.childForFieldName("arguments")

    if (!calleeN || !argumentsN) return undefined

    const callee = printNode(calleeN, ctx) ?? empty()
    const args = empty() // TODO

    return concat([callee, text("("), args, text(")")])
}

function printBinaryExpression(node: Node, ctx: Ctx) {
    const leftN = node.child(0)
    const operatorN = node.childForFieldName("operator_name")
    const rightN = node.child(node.childCount - 1)

    if (!leftN || !operatorN || !rightN) return undefined

    const left = printNode(leftN, ctx) ?? empty()
    const right = printNode(rightN, ctx) ?? empty()
    const operator = operatorN.text;

    const afterOperator = takeTrailing(leftN, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([left, text(" "), text(operator), ...afterOperator, line(), group([right])])
}

function printBlockStatement(node: Node, ctx: Ctx) {
    const statements = node.namedChildren.filter(it => it !== null)

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );
    const dangling = takeDangling(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

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

function printExpressionStatement(node: Node, ctx: Ctx) {
    const expr = node.firstChild
    if (!expr) return undefined

    return concat([
        printNode(expr, ctx) ?? empty(),
        text(";")
    ])
}

function printSourceFile(node: Node, ctx: Ctx) {
    const decls = node.children
        .filter(it => it !== null)
        .filter(it => it?.type !== "comment");

    return concat(decls.map(it => concat([printNode(it, ctx) ?? empty(), hardLine(), hardLine()])))
}

function printIdentifier(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

export const printNode = (node: Node, ctx: Ctx): Doc | undefined => {
    if (node.type === "source_file") {
        return printSourceFile(node, ctx);
    }

    if (node.type === "number_literal") {
        return printNumberLiteral(node, ctx)
    }

    if (node.type === "identifier" || node.type === "type_identifier") {
        return printIdentifier(node, ctx);
    }

    if (node.type === "type_alias_declaration") {
        return printTypeAlias(node, ctx);
    }

    if (node.type === "function_declaration") {
        return printFunction(node, ctx);
    }

    if (node.type === "union_type") {
        return printUnionType(node, ctx);
    }

    if (node.type === "dot_access") {
        return printDotAccess(node, ctx);
    }

    if (node.type === "function_call") {
        return printFunctionCall(node, ctx);
    }

    if (node.type === "binary_operator") {
        return printBinaryExpression(node, ctx);
    }

    if (node.type === "if_statement") {
        return printIf(node, ctx)
    }

    if (node.type === "block_statement") {
        return printBlockStatement(node, ctx);
    }

    if (node.type === "expression_statement") {
        return printExpressionStatement(node, ctx);
    }

    return undefined
}

const unionTypeParts = (node: Node): Node[] => {
    const lhs = node.childForFieldName("lhs")
    const rhs = node.childForFieldName("rhs")

    if (!lhs || !rhs) return []

    if (rhs.type === "union_type") {
        const rhsTypes = unionTypeParts(rhs)
        if (!rhsTypes) return []
        return [lhs, ...rhsTypes]
    }

    return [lhs, rhs]
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
