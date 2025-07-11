import {createTolkParser, initParser} from "./parser";
import {printNode} from "./rules";
import util from 'node:util';
import {render} from "./render";

const main = async () => {
    await initParser("../wasm/tree-sitter.wasm", "../wasm/tree-sitter-tolk.wasm")

    const parser = createTolkParser()

    const cst = parser.parse(`
type Foo = int | string

type Bar = SomeVeryLongType | OtherLongType | AndThirdLongType
    
fun main() {
    if (foo.somethingReallyLong.andHereAsWell() && foo.other) {
        10;
    }
}`)
    console.log(cst?.rootNode?.toString())

    if (!cst?.rootNode) throw Error(`Unable to parse file`);

    const doc = printNode(cst?.rootNode, {})
    console.log(util.inspect(doc, {depth: Infinity}))

    if (doc) {
        console.log(render(doc, 30))
    }
}

void main()
