import {createTolkParser, initParser} from "./parser";
import {bindComments} from "./comments";
import {render} from "./render";
import {Ctx} from "./print/ctx";
import {printNode} from "./print/node";

const main = async () => {
    await initParser("../wasm/tree-sitter.wasm", "../wasm/tree-sitter-tolk.wasm")

    const parser = createTolkParser()

    const cst = parser.parse(`
struct Foo { a: int }

fun main() {
    // comment here
    val foo = 10;
    // and there
    print(foo);
}`)

    if (!cst?.rootNode) throw Error(`Unable to parse file`);

    const ctx: Ctx = {comments: bindComments(cst?.rootNode)};
    const doc = printNode(cst?.rootNode, ctx)

    if (doc) {
        console.log(render(doc, 30))
    }
}

void main()
