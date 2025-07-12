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
    const parametersN = node.childForFieldName("parameters")
    const returnTypeN = node.childForFieldName("return_type")
    const bodyN = node.childForFieldName("body")

    if (!nameN || !parametersN || !bodyN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const name = text(nameN.text)
    const parameters = printNode(parametersN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    let returnTypePart = empty()
    if (returnTypeN) {
        const returnType = printNode(returnTypeN, ctx) ?? empty()
        returnTypePart = concat([text(": "), returnType])
    }

    return group([
        ...leading,
        text("fun "),
        name,
        parameters,
        returnTypePart,
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
    const args = printNode(argumentsN, ctx) ?? empty()

    return concat([callee, args])
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

    if (node.type === "string_literal") {
        return printStringLiteral(node, ctx)
    }

    if (node.type === "boolean_literal") {
        return printBooleanLiteral(node, ctx)
    }

    if (node.type === "null_literal") {
        return printNullLiteral(node, ctx)
    }

    if (node.type === "underscore") {
        return printUnderscore(node, ctx)
    }

    if (node.type === "identifier" || node.type === "type_identifier") {
        return printIdentifier(node, ctx);
    }

    if (node.type === "type_alias_declaration") {
        return printTypeAlias(node, ctx);
    }

    if (node.type === "constant_declaration") {
        return printConstantDeclaration(node, ctx);
    }

    if (node.type === "function_declaration") {
        return printFunction(node, ctx);
    }

    if (node.type === "union_type") {
        return printUnionType(node, ctx);
    }

    if (node.type === "nullable_type") {
        return printNullableType(node, ctx);
    }

    if (node.type === "parenthesized_type") {
        return printParenthesizedType(node, ctx);
    }

    if (node.type === "tensor_type") {
        return printTensorType(node, ctx);
    }

    if (node.type === "tuple_type") {
        return printTupleType(node, ctx);
    }

    if (node.type === "dot_access") {
        return printDotAccess(node, ctx);
    }

    if (node.type === "function_call") {
        return printFunctionCall(node, ctx);
    }

    if (node.type === "argument_list") {
        return printArgumentList(node, ctx);
    }

    if (node.type === "call_argument") {
        return printCallArgument(node, ctx);
    }

    if (node.type === "binary_operator") {
        return printBinaryExpression(node, ctx);
    }

    if (node.type === "assignment") {
        return printAssignment(node, ctx);
    }

    if (node.type === "unary_operator") {
        return printUnaryOperator(node, ctx);
    }

    if (node.type === "parenthesized_expression") {
        return printParenthesizedExpression(node, ctx);
    }

    if (node.type === "tensor_expression") {
        return printTensorExpression(node, ctx);
    }

    if (node.type === "typed_tuple") {
        return printTypedTuple(node, ctx);
    }

    if (node.type === "cast_as_operator") {
        return printCastAsOperator(node, ctx);
    }

    if (node.type === "is_type_operator") {
        return printIsTypeOperator(node, ctx);
    }

    if (node.type === "not_null_operator") {
        return printNotNullOperator(node, ctx);
    }

    if (node.type === "lazy_expression") {
        return printLazyExpression(node, ctx);
    }

    if (node.type === "ternary_operator") {
        return printTernaryOperator(node, ctx);
    }

    if (node.type === "object_literal") {
        return printObjectLiteral(node, ctx);
    }

    if (node.type === "object_literal_body") {
        return printObjectLiteralBody(node, ctx);
    }

    if (node.type === "instance_argument") {
        return printInstanceArgument(node, ctx);
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

    if (node.type === "return_statement") {
        return printReturnStatement(node, ctx);
    }

    if (node.type === "break_statement") {
        return printBreakStatement(node, ctx);
    }

    if (node.type === "continue_statement") {
        return printContinueStatement(node, ctx);
    }

    if (node.type === "throw_statement") {
        return printThrowStatement(node, ctx);
    }

    if (node.type === "while_statement") {
        return printWhileStatement(node, ctx);
    }

    if (node.type === "do_while_statement") {
        return printDoWhileStatement(node, ctx);
    }

    if (node.type === "repeat_statement") {
        return printRepeatStatement(node, ctx);
    }

    if (node.type === "local_vars_declaration") {
        return printLocalVarsDeclaration(node, ctx);
    }

    if (node.type === "var_declaration") {
        return printVarDeclaration(node, ctx);
    }

    if (node.type === "tuple_vars_declaration") {
        return printTupleVarsDeclaration(node, ctx);
    }

    if (node.type === "tensor_vars_declaration") {
        return printTensorVarsDeclaration(node, ctx);
    }

    if (node.type === "parameter_list") {
        return printParameterList(node, ctx);
    }

    if (node.type === "parameter_declaration") {
        return printParameterDeclaration(node, ctx);
    }

    if (node.type === "method_declaration") {
        return printMethodDeclaration(node, ctx);
    }

    if (node.type === "get_method_declaration") {
        return printGetMethodDeclaration(node, ctx);
    }

    // Top-level declarations
    if (node.type === "tolk_required_version") {
        return printTolkRequiredVersion(node, ctx);
    }

    if (node.type === "version_value") {
        return printVersionValue(node, ctx);
    }

    if (node.type === "import_directive") {
        return printImportDirective(node, ctx);
    }

    if (node.type === "global_var_declaration") {
        return printGlobalVarDeclaration(node, ctx);
    }

    if (node.type === "struct_declaration") {
        return printStructDeclaration(node, ctx);
    }

    if (node.type === "struct_body") {
        return printStructBody(node, ctx);
    }

    if (node.type === "struct_field_declaration") {
        return printStructFieldDeclaration(node, ctx);
    }

    if (node.type === "empty_statement") {
        return printEmptyStatement(node, ctx);
    }

    // Advanced expressions
    if (node.type === "set_assignment") {
        return printSetAssignment(node, ctx);
    }

    // Generics
    if (node.type === "type_parameters") {
        return printTypeParameters(node, ctx);
    }

    if (node.type === "type_parameter") {
        return printTypeParameter(node, ctx);
    }

    if (node.type === "type_instantiatedTs") {
        return printTypeInstantiatedTs(node, ctx);
    }

    if (node.type === "generic_instantiation") {
        return printGenericInstantiation(node, ctx);
    }

    if (node.type === "instantiationT_list") {
        return printInstantiationTList(node, ctx);
    }

    // Advanced functions
    if (node.type === "asm_body") {
        return printAsmBody(node, ctx);
    }

    if (node.type === "builtin_specifier") {
        return printBuiltinSpecifier(node, ctx);
    }

    if (node.type === "method_receiver") {
        return printMethodReceiver(node, ctx);
    }

    // Annotations
    if (node.type === "annotation_list") {
        return printAnnotationList(node, ctx);
    }

    if (node.type === "annotation") {
        return printAnnotation(node, ctx);
    }

    if (node.type === "annotation_arguments") {
        return printAnnotationArguments(node, ctx);
    }

    // Advanced types
    if (node.type === "fun_callable_type") {
        return printFunCallableType(node, ctx);
    }

    // Error handling
    if (node.type === "assert_statement") {
        return printAssertStatement(node, ctx);
    }

    if (node.type === "try_catch_statement") {
        return printTryCatchStatement(node, ctx);
    }

    if (node.type === "catch_clause") {
        return printCatchClause(node, ctx);
    }

    // Pattern matching
    if (node.type === "match_statement") {
        return printMatchStatement(node, ctx);
    }

    if (node.type === "match_expression") {
        return printMatchExpression(node, ctx);
    }

    if (node.type === "match_body") {
        return printMatchBody(node, ctx);
    }

    if (node.type === "match_arm") {
        return printMatchArm(node, ctx);
    }

    // Misc constructs
    if (node.type === "numeric_index") {
        return printNumericIndex(node, ctx);
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

function printStringLiteral(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

function printBooleanLiteral(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

function printNullLiteral(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

function printUnderscore(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

function printConstantDeclaration(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const valueN = node.childForFieldName("value")
    const typeN = node.childForFieldName("type")

    if (!nameN || !valueN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    const name = text(nameN.text)
    const value = printNode(valueN, ctx) ?? empty()
    const type = typeN ? concat([text(": "), printNode(typeN, ctx) ?? empty(), text(" ")]) : empty()

    return group([
        ...leading,
        text("const "),
        name,
        text(" "),
        type,
        text("= "),
        value,
        ...trailing,
    ])
}

function printNullableType(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([inner, text("?"), ...trailing])
}

function printParenthesizedType(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("("), inner, text(")"), ...trailing])
}

function printTensorType(node: Node, ctx: Ctx) {
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

function printTupleType(node: Node, ctx: Ctx) {
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

function printAssignment(node: Node, ctx: Ctx) {
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

function printUnaryOperator(node: Node, ctx: Ctx) {
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

function printParenthesizedExpression(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("("), inner, text(")"), ...trailing])
}

function printTensorExpression(node: Node, ctx: Ctx) {
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

function printTypedTuple(node: Node, ctx: Ctx) {
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

function printCastAsOperator(node: Node, ctx: Ctx) {
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

function printIsTypeOperator(node: Node, ctx: Ctx) {
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

function printNotNullOperator(node: Node, ctx: Ctx) {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([inner, text("!"), ...trailing])
}

function printLazyExpression(node: Node, ctx: Ctx) {
    const argumentN = node.childForFieldName("argument")
    if (!argumentN) return undefined

    const argument = printNode(argumentN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([text("lazy "), argument, ...trailing])
}

function printTernaryOperator(node: Node, ctx: Ctx) {
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
        text(" ? "),
        consequence,
        text(" : "),
        alternative,
        ...trailing,
    ])
}

function printArgumentList(node: Node, ctx: Ctx) {
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

function printCallArgument(node: Node, ctx: Ctx) {
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

function printReturnStatement(node: Node, ctx: Ctx) {
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

function printBreakStatement(node: Node, ctx: Ctx) {
    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([...leading, text("break"), ...trailing])
}

function printContinueStatement(node: Node, ctx: Ctx) {
    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([...leading, text("continue"), ...trailing])
}

function printThrowStatement(node: Node, ctx: Ctx) {
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

function printWhileStatement(node: Node, ctx: Ctx) {
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

function printDoWhileStatement(node: Node, ctx: Ctx) {
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

function printRepeatStatement(node: Node, ctx: Ctx) {
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

function printLocalVarsDeclaration(node: Node, ctx: Ctx) {
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

function printVarDeclaration(node: Node, ctx: Ctx) {
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

function printTupleVarsDeclaration(node: Node, ctx: Ctx) {
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

function printTensorVarsDeclaration(node: Node, ctx: Ctx) {
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

function printParameterList(node: Node, ctx: Ctx) {
    const params = node.namedChildren.filter(child => child !== null && child.type === "parameter_declaration") as Node[]

    if (params.length === 0) {
        return text("()")
    }

    const parts = params.map(param => printNode(param, ctx) ?? empty())
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

function printParameterDeclaration(node: Node, ctx: Ctx) {
    const mutateN = node.childForFieldName("mutate")
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")
    const defaultN = node.childForFieldName("default")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    let result = [name]

    if (mutateN) {
        result = [text("mutate "), ...result]
    }

    if (typeN) {
        const type = printNode(typeN, ctx) ?? empty()
        result = [...result, text(": "), type]
    }

    if (defaultN) {
        const defaultVal = printNode(defaultN, ctx) ?? empty()
        result = [...result, text(" = "), defaultVal]
    }

    return concat([...result, ...trailing])
}

function printMethodDeclaration(node: Node, ctx: Ctx) {
    const receiverN = node.childForFieldName("receiver")
    const nameN = node.childForFieldName("name")
    const parametersN = node.childForFieldName("parameters")
    const returnTypeN = node.childForFieldName("return_type")
    const bodyN = node.childForFieldName("body")

    if (!receiverN || !nameN || !parametersN || !bodyN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const receiver = printNode(receiverN, ctx) ?? empty()
    const name = text(nameN.text)
    const parameters = printNode(parametersN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    let returnTypePart = empty()
    if (returnTypeN) {
        const returnType = printNode(returnTypeN, ctx) ?? empty()
        returnTypePart = concat([text(": "), returnType])
    }

    return group([
        ...leading,
        text("fun "),
        receiver,
        name,
        parameters,
        returnTypePart,
        text(" "),
        body,
    ])
}

function printGetMethodDeclaration(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const parametersN = node.childForFieldName("parameters")
    const returnTypeN = node.childForFieldName("return_type")
    const bodyN = node.childForFieldName("body")

    if (!nameN || !parametersN || !bodyN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const name = text(nameN.text)
    const parameters = printNode(parametersN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    let returnTypePart = empty()
    if (returnTypeN) {
        const returnType = printNode(returnTypeN, ctx) ?? empty()
        returnTypePart = concat([text(": "), returnType])
    }

    return group([
        ...leading,
        text("get "),
        name,
        parameters,
        returnTypePart,
        text(" "),
        body,
    ])
}

function printObjectLiteral(node: Node, ctx: Ctx) {
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

function printObjectLiteralBody(node: Node, ctx: Ctx) {
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
        return concat([text("{"), parts[0], text("}"), ...trailing])
    }

    if (parts.length === 2) {
        return concat([text("{"), parts[0], text(", "), parts[1], text("}"), ...trailing])
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

function printInstanceArgument(node: Node, ctx: Ctx) {
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

// ========== TOP-LEVEL DECLARATIONS ==========

function printTolkRequiredVersion(node: Node, ctx: Ctx) {
    const valueN = node.childForFieldName("value")
    if (!valueN) return undefined

    const value = printNode(valueN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("tolk "), value, ...trailing])
}

function printVersionValue(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

function printImportDirective(node: Node, ctx: Ctx) {
    const pathN = node.childForFieldName("path")
    if (!pathN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const path = printNode(pathN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        ...leading,
        text("import "),
        path,
        ...trailing,
    ])
}

function printGlobalVarDeclaration(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")
    const annotationsN = node.childForFieldName("annotations")

    if (!nameN || !typeN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const name = printNode(nameN, ctx) ?? empty()
    const type = printNode(typeN, ctx) ?? empty()
    const annotations = annotationsN ? printNode(annotationsN, ctx) ?? empty() : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        ...leading,
        annotations,
        annotations !== empty() ? hardLine() : empty(),
        text("global "),
        name,
        text(": "),
        type,
        ...trailing,
    ])
}

function printStructDeclaration(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const bodyN = node.childForFieldName("body")
    const annotationsN = node.childForFieldName("annotations")
    const typeParametersN = node.childForFieldName("type_parameters")
    const packPrefixN = node.childForFieldName("pack_prefix")

    if (!nameN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const name = printNode(nameN, ctx) ?? empty()
    const body = bodyN ? printNode(bodyN, ctx) ?? empty() : empty()
    const annotations = annotationsN ? printNode(annotationsN, ctx) ?? empty() : empty()
    const typeParameters = typeParametersN ? printNode(typeParametersN, ctx) ?? empty() : empty()
    const packPrefix = packPrefixN ? concat([text("("), printNode(packPrefixN, ctx) ?? empty(), text(")")]) : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return group([
        ...leading,
        annotations,
        annotations !== empty() ? hardLine() : empty(),
        text("struct "),
        packPrefix,
        name,
        typeParameters,
        text(" "),
        body,
        ...trailing,
    ])
}

function printStructBody(node: Node, ctx: Ctx) {
    const fields = node.namedChildren.filter(child => child !== null && child.type === "struct_field_declaration") as Node[]

    if (fields.length === 0) {
        return text("{}")
    }

    const parts = fields.map(field => printNode(field, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    if (parts.length === 1) {
        return concat([text("{ "), parts[0], text(" }"), ...trailing])
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

function printStructFieldDeclaration(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")
    const defaultN = node.childForFieldName("default")

    if (!nameN || !typeN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const type = printNode(typeN, ctx) ?? empty()
    const defaultVal = defaultN ? printNode(defaultN, ctx) ?? empty() : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    let result = [name, text(": "), type]

    if (defaultVal !== empty()) {
        result = [...result, text(" = "), defaultVal]
    }

    return concat([...result, ...trailing])
}

function printEmptyStatement(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(";"), ...trailing])
}

// ========== ADVANCED EXPRESSIONS ==========

function printSetAssignment(node: Node, ctx: Ctx) {
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

// ========== GENERICS ==========

function printTypeParameters(node: Node, ctx: Ctx) {
    const params = node.namedChildren.filter(child => child !== null && child.type === "type_parameter") as Node[]

    if (params.length === 0) {
        return text("<>")
    }

    const parts = params.map(param => printNode(param, ctx) ?? empty())
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

function printTypeParameter(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const defaultN = node.childForFieldName("default")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const defaultVal = defaultN ? printNode(defaultN, ctx) ?? empty() : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    let result = [name]

    if (defaultVal !== empty()) {
        result = [...result, text(" = "), defaultVal]
    }

    return concat([...result, ...trailing])
}

function printTypeInstantiatedTs(node: Node, ctx: Ctx) {
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

function printGenericInstantiation(node: Node, ctx: Ctx) {
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

function printInstantiationTList(node: Node, ctx: Ctx) {
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

// ========== ADVANCED FUNCTIONS ==========

function printAsmBody(node: Node, ctx: Ctx) {
    const leading = takeLeading(node, ctx.comments).map(c =>
        concat([text(c.text), hardLine()])
    );

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    const strings = node.namedChildren.filter(child => child !== null && child.type === "string_literal") as Node[]
    const stringParts = strings.map(str => printNode(str, ctx) ?? empty())

    return group([
        ...leading,
        text("asm "),
        ...stringParts,
        ...trailing,
    ])
}

function printBuiltinSpecifier(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("builtin"), ...trailing])
}

function printMethodReceiver(node: Node, ctx: Ctx) {
    const receiverTypeN = node.childForFieldName("receiver_type")
    if (!receiverTypeN) return undefined

    const receiverType = printNode(receiverTypeN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([receiverType, text("."), ...trailing])
}

// ========== ANNOTATIONS ==========

function printAnnotationList(node: Node, ctx: Ctx) {
    const annotations = node.namedChildren.filter(child => child !== null && child.type === "annotation") as Node[]

    if (annotations.length === 0) {
        return empty()
    }

    const parts = annotations.map(annotation => printNode(annotation, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([
        ...parts.map(part => concat([part, hardLine()])),
        ...trailing,
    ])
}

function printAnnotation(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const argumentsN = node.childForFieldName("arguments")

    const name = nameN ? printNode(nameN, ctx) ?? empty() : empty()
    const args = argumentsN ? printNode(argumentsN, ctx) ?? empty() : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("@"), name, args, ...trailing])
}

function printAnnotationArguments(node: Node, ctx: Ctx) {
    const exprs = node.namedChildren.filter(child => child !== null && child.type !== "," && child.type !== "(" && child.type !== ")") as Node[]

    if (exprs.length === 0) {
        return text("()")
    }

    const parts = exprs.map(expr => printNode(expr, ctx) ?? empty())
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

// ========== ADVANCED TYPES ==========

function printFunCallableType(node: Node, ctx: Ctx) {
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

// ========== ERROR HANDLING ==========

function printAssertStatement(node: Node, ctx: Ctx) {
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

function printTryCatchStatement(node: Node, ctx: Ctx) {
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

function printCatchClause(node: Node, ctx: Ctx) {
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

// ========== PATTERN MATCHING ==========

function printMatchStatement(node: Node, ctx: Ctx) {
    return printMatchExpression(node, ctx)
}

function printMatchExpression(node: Node, ctx: Ctx) {
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

function printMatchBody(node: Node, ctx: Ctx) {
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

function printMatchArm(node: Node, ctx: Ctx) {
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

// ========== MISC CONSTRUCTS ==========

function printNumericIndex(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}
