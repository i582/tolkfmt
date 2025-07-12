import {Node} from "web-tree-sitter";
import {Ctx} from "./ctx";
import {printNode} from "./node";
import {concat, empty, group, hardLine, indent, line, softLine, text} from "../doc";
import {takeTrailing} from "../comments";

export function printDotAccess(node: Node, ctx: Ctx) {
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

export function printFunctionCall(node: Node, ctx: Ctx) {
    const calleeN = node.childForFieldName("callee")
    const argumentsN = node.childForFieldName("arguments")

    if (!calleeN || !argumentsN) return undefined

    const callee = printNode(calleeN, ctx) ?? empty()
    const args = printNode(argumentsN, ctx) ?? empty()

    return concat([callee, args])
}

export function printBinaryExpression(node: Node, ctx: Ctx) {
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

export function printIdentifier(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

export const printNumberLiteral = (node: Node, _ctx: Ctx) => {
    return text(node.text)
}

export function printStringLiteral(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

export function printBooleanLiteral(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

export function printNullLiteral(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

export function printUnderscore(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

export function printUnaryOperator(node: Node, ctx: Ctx) {
    const operatorN = node.childForFieldName("operator_name")
    const argumentN = node.childForFieldName("argument")

    if (!operatorN || !argumentN) return undefined

    const operator = operatorN.text
    const argument = printNode(argumentN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(operator), argument, ...trailing])
}

export function printParenthesizedExpression(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("("), inner, text(")"), ...trailing])
}

export function printTensorExpression(node: Node, ctx: Ctx) {
    const expressions = node.namedChildren.filter(child => child !== null && child.type !== "," && child.type !== "(" && child.type !== ")") as Node[]

    if (expressions.length === 0) {
        return text("()")
    }

    const parts = expressions.map(expr => printNode(expr, ctx) ?? empty())
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

export function printTypedTuple(node: Node, ctx: Ctx) {
    const expressions = node.namedChildren.filter(child => child !== null && child.type !== "," && child.type !== "[" && child.type !== "]") as Node[]

    if (expressions.length === 0) {
        return text("[]")
    }

    const parts = expressions.map(expr => printNode(expr, ctx) ?? empty())
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

export function printCastAsOperator(node: Node, ctx: Ctx) {
    const exprN = node.childForFieldName("expr")
    const castedToN = node.childForFieldName("casted_to")

    if (!exprN || !castedToN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const castedTo = printNode(castedToN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([expr, text(" as "), castedTo, ...trailing])
}

export function printIsTypeOperator(node: Node, ctx: Ctx) {
    const exprN = node.childForFieldName("expr")
    const operatorN = node.childForFieldName("operator")
    const rhsTypeN = node.childForFieldName("rhs_type")

    if (!exprN || !operatorN || !rhsTypeN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const operator = operatorN.text
    const rhsType = printNode(rhsTypeN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([expr, text(" "), text(operator), text(" "), rhsType, ...trailing])
}

export function printNotNullOperator(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([inner, text("!"), ...trailing])
}

export function printLazyExpression(node: Node, ctx: Ctx) {
    const argumentN = node.childForFieldName("argument")
    if (!argumentN) return undefined

    const argument = printNode(argumentN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([text("lazy "), argument, ...trailing])
}

export function printTernaryOperator(node: Node, ctx: Ctx) {
    const conditionN = node.childForFieldName("condition")
    const consequenceN = node.childForFieldName("consequence")
    const alternativeN = node.childForFieldName("alternative")

    if (!conditionN || !consequenceN || !alternativeN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const consequence = printNode(consequenceN, ctx) ?? empty()
    const alternative = printNode(alternativeN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        condition,
        indent(concat([
            softLine(),
            text(" ? "),
            consequence,
            softLine(),
            text(" : "),
            alternative,
            ...trailing,
        ])),
    ])
}

export function printArgumentList(node: Node, ctx: Ctx) {
    const args = node.namedChildren.filter(child => child !== null && child.type === "call_argument") as Node[]

    if (args.length === 0) {
        return text("()")
    }

    const parts = args.map(arg => printNode(arg, ctx) ?? empty())
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

export function printCallArgument(node: Node, ctx: Ctx) {
    const exprN = node.childForFieldName("expr")
    if (!exprN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    // Check if there's a "mutate" keyword
    const mutateNode = node.children.find(child => child?.text === "mutate")
    if (mutateNode) {
        return concat([text("mutate "), expr, ...trailing])
    }

    return concat([expr, ...trailing])
}

export function printObjectLiteral(node: Node, ctx: Ctx) {
    const typeN = node.childForFieldName("type")
    const argumentsN = node.childForFieldName("arguments")

    if (!argumentsN) return undefined

    const type = typeN ? printNode(typeN, ctx) ?? empty() : empty()
    const args = printNode(argumentsN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([type, args, ...trailing])
}

export function printObjectLiteralBody(node: Node, ctx: Ctx) {
    const args = node.namedChildren.filter(child => child !== null && child.type === "instance_argument") as Node[]

    if (args.length === 1) {
        // Check if this is actually an empty object
        const singleArg = args[0]

        // If the argument is empty or just whitespace, treat as empty object
        if (singleArg.text.trim() === "") {
            return text("{}")
        }
    }

    if (args.length === 0) {
        return text("{}")
    }

    const parts = args.map(arg => printNode(arg, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    // For simple cases, keep it compact
    if (parts.length === 1) {
        return concat([text("{ "), parts[0], text(" }"), ...trailing])
    }

    if (parts.length === 2) {
        return concat([text("{ "), parts[0], text(", "), parts[1], text(" }"), ...trailing])
    }

    const [first, ...rest] = parts;
    const tailDocs = rest.map(part => concat([text(", "), part]))

    return group([
        text("{"),
        indent(concat([
            softLine(),
            first,
            ...tailDocs,
        ])),
        softLine(),
        text("}"),
        ...trailing,
    ])
}

export function printInstanceArgument(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const valueN = node.childForFieldName("value")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    // Check if there's a colon in the node
    const hasColon = node.children.some(child => child?.text === ":")

    if (hasColon) {
        if (valueN) {
            const value = printNode(valueN, ctx) ?? empty()
            return concat([name, text(": "), value, ...trailing])
        } else {
            // Case like {foo:}
            return concat([name, text(":"), ...trailing])
        }
    } else {
        // Case like {foo} without colon
        return concat([name, ...trailing])
    }
}

export function printTypeInstantiatedTs(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const argumentsN = node.childForFieldName("arguments")

    if (!nameN || !argumentsN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const args = printNode(argumentsN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([name, args, ...trailing])
}

export function printGenericInstantiation(node: Node, ctx: Ctx) {
    const exprN = node.childForFieldName("expr")
    const instantiationTsN = node.childForFieldName("instantiationTs")

    if (!exprN || !instantiationTsN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const instantiationTs = printNode(instantiationTsN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([expr, instantiationTs, ...trailing])
}

export function printInstantiationTList(node: Node, ctx: Ctx) {
    const typesN = node.childForFieldName("types")

    if (!typesN) {
        // Handle case where types are direct children
        const types = node.namedChildren.filter(child => child !== null && child.type !== "," && child.type !== "<" && child.type !== ">") as Node[]

        if (types.length === 0) {
            return text("<>")
        }

        const parts = types.map(type => printNode(type, ctx) ?? empty())
        const trailing = takeTrailing(node, ctx.comments).map(c =>
            concat([text(" "), text(c.text)])
        );

        if (parts.length === 1) {
            return concat([text("<"), parts[0], text(">"), ...trailing])
        }

        const [first, ...rest] = parts;
        const tailDocs = rest.map(part => concat([text(", "), part]))

        return group([
            text("<"),
            indent(concat([
                softLine(),
                first,
                ...tailDocs,
            ])),
            softLine(),
            text(">"),
            ...trailing,
        ])
    }

    const types = printNode(typesN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("<"), types, text(">"), ...trailing])
}

export function printMatchExpression(node: Node, ctx: Ctx) {
    const exprN = node.childForFieldName("expr")
    const bodyN = node.childForFieldName("body")

    if (!exprN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const body = bodyN ? printNode(bodyN, ctx) ?? empty() : text("{}")

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        text("match("),
        expr,
        text(") "),
        body,
        ...trailing,
    ])
}

export function printMatchBody(node: Node, ctx: Ctx) {
    const arms = node.namedChildren.filter(child => child !== null && child.type === "match_arm") as Node[]

    if (arms.length === 0) {
        return text("{}")
    }

    const parts = arms.map(arm => printNode(arm, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        text("{"),
        indent(concat([
            hardLine(),
            ...parts.map(part => concat([part, hardLine()])),
        ])),
        text("}"),
        ...trailing,
    ])
}

export function printMatchArm(node: Node, ctx: Ctx) {
    const patternTypeN = node.childForFieldName("pattern_type")
    const patternExprN = node.childForFieldName("pattern_expr")
    const patternElseN = node.childForFieldName("pattern_else")
    const bodyN = node.childForFieldName("body")

    if (!bodyN) return undefined

    const body = printNode(bodyN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    let pattern = empty()
    if (patternTypeN) {
        pattern = printNode(patternTypeN, ctx) ?? empty()
    } else if (patternExprN) {
        pattern = printNode(patternExprN, ctx) ?? empty()
    } else if (patternElseN) {
        pattern = text("else")
    }

    return concat([
        pattern,
        text(" => "),
        body,
        ...trailing,
    ])
}

export function printNumericIndex(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}
