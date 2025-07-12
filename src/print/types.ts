import {takeTrailing} from "../comments";
import {Node} from "web-tree-sitter";
import {concat, empty, group, ifBreak, indent, line, softLine, text} from "../doc";
import {Ctx} from "./ctx";
import {printNode} from "./node";

export function printUnionType(node: Node, ctx: Ctx) {
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

export function printNullableType(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([inner, text("?"), ...trailing])
}

export function printParenthesizedType(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("("), inner, text(")"), ...trailing])
}

export function printTensorType(node: Node, ctx: Ctx) {
    const types = node.namedChildren.filter(child => child !== null && child.type !== "," && child.type !== "(" && child.type !== ")") as Node[]

    if (types.length === 0) {
        return text("()")
    }

    const parts = types.map(type => printNode(type, ctx) ?? empty())
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

export function printTupleType(node: Node, ctx: Ctx) {
    const types = node.namedChildren.filter(child => child !== null && child.type !== "," && child.type !== "[" && child.type !== "]") as Node[]

    if (types.length === 0) {
        return text("[]")
    }

    const parts = types.map(type => printNode(type, ctx) ?? empty())
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

export function printFunCallableType(node: Node, ctx: Ctx) {
    const paramTypesN = node.childForFieldName("param_types")
    const returnTypeN = node.childForFieldName("return_type")

    if (!paramTypesN || !returnTypeN) return undefined

    const paramTypes = printNode(paramTypesN, ctx) ?? empty()
    const returnType = printNode(returnTypeN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        paramTypes,
        text(" -> "),
        returnType,
        ...trailing,
    ])
}
