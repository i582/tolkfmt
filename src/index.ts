import {createTolkParser, initParser} from "./parser";
import {Ctx, printNode} from "./rules";
import {render} from "./render";
import {bindComments} from "./comments";

export const format = async (code: string, opts?: { maxWidth?: number }): Promise<string> => {
    const {maxWidth = 80} = opts ?? {};

    await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)
    const parser = createTolkParser()

    const cst = parser.parse(code)

    const rootNode = cst?.rootNode;
    if (!rootNode) return code;

    const ctx: Ctx = {comments: bindComments(rootNode)};
    const doc = printNode(rootNode, ctx)
    if (!doc) return code;

    return render(doc, maxWidth)
}
