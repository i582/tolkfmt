import {Node} from "web-tree-sitter";
import {concat, empty, group, hardLine, indent, softLine, text} from "../doc";
import {takeLeading, takeTrailing} from "../comments";

import {Ctx} from "./ctx";
import {printNode} from "./node";

export function printSourceFile(node: Node, ctx: Ctx) {
    const decls = node.children
        .filter(it => it !== null)
        .filter(it => it?.type !== "comment");

    return concat(decls.map(it => concat([printNode(it, ctx) ?? empty(), hardLine(), hardLine()])))
}

export function printVersionValue(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text(node.text), ...trailing])
}

export function printTypeAlias(node: Node, ctx: Ctx) {
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

export function printFunction(node: Node, ctx: Ctx) {
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

export function printParameterList(node: Node, ctx: Ctx) {
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

export function printParameterDeclaration(node: Node, ctx: Ctx) {
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

export function printBuiltinSpecifier(node: Node, ctx: Ctx) {
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("builtin"), ...trailing])
}

export function printConstantDeclaration(node: Node, ctx: Ctx) {
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

export function printMethodDeclaration(node: Node, ctx: Ctx) {
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

export function printGetMethodDeclaration(node: Node, ctx: Ctx) {
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

export function printTolkRequiredVersion(node: Node, ctx: Ctx) {
    const valueN = node.childForFieldName("value")
    if (!valueN) return undefined

    const value = printNode(valueN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("tolk "), value, ...trailing])
}

export function printImportDirective(node: Node, ctx: Ctx) {
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

export function printGlobalVarDeclaration(node: Node, ctx: Ctx) {
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

export function printStructDeclaration(node: Node, ctx: Ctx) {
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

export function printStructBody(node: Node, ctx: Ctx) {
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

export function printStructFieldDeclaration(node: Node, ctx: Ctx) {
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

export function printTypeParameters(node: Node, ctx: Ctx) {
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

export function printTypeParameter(node: Node, ctx: Ctx) {
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

export function printAsmBody(node: Node, ctx: Ctx) {
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

export function printMethodReceiver(node: Node, ctx: Ctx) {
    const receiverTypeN = node.childForFieldName("receiver_type")
    if (!receiverTypeN) return undefined

    const receiverType = printNode(receiverTypeN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([receiverType, text("."), ...trailing])
}

export function printAnnotationList(node: Node, ctx: Ctx) {
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

export function printAnnotation(node: Node, ctx: Ctx) {
    const nameN = node.childForFieldName("name")
    const argumentsN = node.childForFieldName("arguments")

    const name = nameN ? printNode(nameN, ctx) ?? empty() : empty()
    const args = argumentsN ? printNode(argumentsN, ctx) ?? empty() : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text)])
    );

    return concat([text("@"), name, args, ...trailing])
}

export function printAnnotationArguments(node: Node, ctx: Ctx) {
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
