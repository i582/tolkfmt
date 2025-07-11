import {format} from "../src";
import {initParser} from "../src/parser";

describe('Formatter', () => {
    it('should format', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        expect(await format(`type Foo = int | slice`)).toMatchSnapshot()
        expect(await format(`type Foo = SomeVeryLongType | OtherLongType | AndThirdLongType`, {maxWidth: 30})).toMatchSnapshot()

        expect(await format(`
fun foo() {
    someVeryLongQualifier.someLongField();
}`, {maxWidth: 30})).toMatchSnapshot()

        expect(await format(`
fun foo() {
    foo && someVeryLongQualifier.someLongField();
}`, {maxWidth: 30})).toMatchSnapshot()
    });
});
