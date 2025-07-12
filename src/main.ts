import {createTolkParser, initParser} from "./parser";
import {bindComments} from "./comments";
import {render} from "./render";
import {Ctx} from "./print/ctx";
import {printNode} from "./print/node";

const main = async () => {
    await initParser("../wasm/tree-sitter.wasm", "../wasm/tree-sitter-tolk.wasm")

    const parser = createTolkParser()

    const cst = parser.parse(`
fun main() {
    assert (in.valueCoins >
        msg.forwardTonAmount +
        // 3 messages: wal1->wal2,  wal2->owner, wal2->response
        // but last one is optional (it is ok if it fails)
        forwardedMessagesCount * in.originalForwardFee +
        (2 * JETTON_WALLET_GAS_CONSUMPTION + MIN_TONS_FOR_STORAGE)
    ) throw ERR_NOT_ENOUGH_TON;
}`)

    if (!cst?.rootNode) throw Error(`Unable to parse file`);

    const ctx: Ctx = {comments: bindComments(cst?.rootNode)};
    const doc = printNode(cst?.rootNode, ctx)

    if (doc) {
        console.log(render(doc, 30))
    }
}

void main()
