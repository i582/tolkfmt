import {createTolkParser, initParser} from "./parser"
import {bindComments} from "./comments"
import {render} from "./render"
import type {Ctx} from "./print/ctx"
import {printNode} from "./print/node"

const main = async (): Promise<void> => {
    await initParser("../wasm/tree-sitter.wasm", "../wasm/tree-sitter-tolk.wasm")

    const parser = createTolkParser()

    const cst = parser.parse(`
fun foo() {
    Foo { /*aa*/ foo: bar, bar: foo}
}`)

    if (!cst?.rootNode) throw new Error(`Unable to parse file`)

    const ctx: Ctx = {comments: bindComments(cst.rootNode)}
    const doc = printNode(cst.rootNode, ctx)

    if (doc) {
        console.log(render(doc, 100))
    }
}

void main()
