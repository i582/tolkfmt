import {createTolkParser, initParser} from "./parser";
import {Ctx, printNode} from "./rules";
import {render} from "./render";
import {bindComments} from "./comments";

const main = async () => {
    await initParser("../wasm/tree-sitter.wasm", "../wasm/tree-sitter-tolk.wasm")

    const parser = createTolkParser()

    const cst = parser.parse(`
// type foo
type Foo = int | string

// type bar
type Bar = SomeVeryLongType | OtherLongType | AndThirdLongType // foo

type Bar = SomeVeryLongType // comment
| OtherLongType | AndThirdLongType

// hello world
// foo
fun main() {
    foo/* aa */.bar;

    // if statement
    if (foo.somethingReallyLong/*aaa*/.andHereAsWell() && /* wtf */ foo.other) {
        // integer literal
        10;
    }
}`)
    // console.log(cst?.rootNode?.toString())

    if (!cst?.rootNode) throw Error(`Unable to parse file`);

    const ctx: Ctx = {comments: bindComments(cst?.rootNode)};
    const doc = printNode(cst?.rootNode, ctx)
    // console.log(util.inspect(doc, {depth: Infinity}))
    // console.log(util.inspect(ctx.comments, {depth: Infinity}))

    if (doc) {
        console.log(render(doc, 30))
    }
}

void main()
