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

    it('should format simple literals', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // String literals in constants
        expect(await format(`const msg = "hello world"`)).toMatchSnapshot()
        expect(await format(`const msg = "hello world"w`)).toMatchSnapshot()

        // String literals in expressions
        expect(await format(`fun test() { "hello world"; }`)).toMatchSnapshot()

        // Boolean literals in constants
        expect(await format(`const flag = true`)).toMatchSnapshot()
        expect(await format(`const flag = false`)).toMatchSnapshot()

        // Boolean literals in expressions
        expect(await format(`fun test() { true; }`)).toMatchSnapshot()

        // Null literal in constant
        expect(await format(`const value = null`)).toMatchSnapshot()

        // Null literal in expression
        expect(await format(`fun test() { null; }`)).toMatchSnapshot()

        // Underscore in expression
        expect(await format(`fun test() { _; }`)).toMatchSnapshot()
    });

    it('should format basic types', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Nullable types
        expect(await format(`type OptionalInt = int?`)).toMatchSnapshot()
        expect(await format(`type OptionalString = string?`)).toMatchSnapshot()

        // Parenthesized types
        expect(await format(`type ParenType = (int)`)).toMatchSnapshot()

        // Tensor types
        expect(await format(`type EmptyTensor = ()`)).toMatchSnapshot()
        expect(await format(`type SingleTensor = (int)`)).toMatchSnapshot()
        expect(await format(`type DoubleTensor = (int, string)`)).toMatchSnapshot()
        expect(await format(`type LongTensor = (VeryLongTypeName, AnotherVeryLongTypeName, ThirdLongTypeName)`, {maxWidth: 30})).toMatchSnapshot()

        // Tuple types
        expect(await format(`type EmptyTuple = []`)).toMatchSnapshot()
        expect(await format(`type SingleTuple = [int]`)).toMatchSnapshot()
        expect(await format(`type DoubleTuple = [int, string]`)).toMatchSnapshot()
        expect(await format(`type LongTuple = [VeryLongTypeName, AnotherVeryLongTypeName, ThirdLongTypeName]`, {maxWidth: 30})).toMatchSnapshot()
    });

    it('should format simple expressions', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Assignment expressions
        expect(await format(`fun test() { x = 42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { veryLongVariableName = veryLongExpressionValue; }`, {maxWidth: 30})).toMatchSnapshot()

        // Unary operators
        expect(await format(`fun test() { !true; }`)).toMatchSnapshot()
        expect(await format(`fun test() { ~42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { -42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { +42; }`)).toMatchSnapshot()

        // Parenthesized expressions
        expect(await format(`fun test() { (42); }`)).toMatchSnapshot()
        expect(await format(`fun test() { (veryLongExpression); }`)).toMatchSnapshot()

        // Tensor expressions
        expect(await format(`fun test() { (); }`)).toMatchSnapshot()
        expect(await format(`fun test() { (42); }`)).toMatchSnapshot()
        expect(await format(`fun test() { (1, 2); }`)).toMatchSnapshot()
        expect(await format(`fun test() { (veryLongExpression, anotherVeryLongExpression, thirdLongExpression); }`, {maxWidth: 30})).toMatchSnapshot()

        // Typed tuples
        expect(await format(`fun test() { []; }`)).toMatchSnapshot()
        expect(await format(`fun test() { [42]; }`)).toMatchSnapshot()
        expect(await format(`fun test() { [1, 2]; }`)).toMatchSnapshot()
        expect(await format(`fun test() { [veryLongExpression, anotherVeryLongExpression, thirdLongExpression]; }`, {maxWidth: 30})).toMatchSnapshot()
    });

    it('should format operators', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Cast as operator
        expect(await format(`fun test() { 42 as int; }`)).toMatchSnapshot()
        expect(await format(`fun test() { someValue as SomeType; }`)).toMatchSnapshot()

        // Is type operator
        expect(await format(`fun test() { x is int; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x !is int; }`)).toMatchSnapshot()

        // Not null operator
        expect(await format(`fun test() { x!; }`)).toMatchSnapshot()
        expect(await format(`fun test() { getValue()!; }`)).toMatchSnapshot()

        // Lazy expression
        expect(await format(`fun test() { lazy expr; }`)).toMatchSnapshot()
        expect(await format(`fun test() { lazy veryLongExpression; }`)).toMatchSnapshot()

        // Ternary operator
        expect(await format(`fun test() { true ? 1 : 2; }`)).toMatchSnapshot()
        expect(await format(`fun test() { condition ? veryLongConsequence : veryLongAlternative; }`, {maxWidth: 30})).toMatchSnapshot()
        expect(await format(`fun test() { condition ? condition1 ? veryLongConsequence1 : veryLongAlternative1 : condition2 ? veryLongConsequence2 : veryLongAlternative2; }`, {maxWidth: 30})).toMatchSnapshot()
    });

    it('should format function calls', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Function calls without arguments
        expect(await format(`fun test() { foo(); }`)).toMatchSnapshot()
        expect(await format(`fun test() { veryLongFunctionName(); }`)).toMatchSnapshot()

        // Function calls with arguments
        expect(await format(`fun test() { foo(42); }`)).toMatchSnapshot()
        expect(await format(`fun test() { foo(1, 2); }`)).toMatchSnapshot()
        expect(await format(`fun test() { foo(1, 2, 3); }`)).toMatchSnapshot()

        // Function calls with long arguments
        expect(await format(`fun test() { foo(veryLongArgument, anotherVeryLongArgument, thirdLongArgument); }`, {maxWidth: 30})).toMatchSnapshot()

        // Function calls with mutate keyword
        expect(await format(`fun test() { foo(mutate x); }`)).toMatchSnapshot()
        expect(await format(`fun test() { foo(x, mutate y); }`)).toMatchSnapshot()

        // Chained function calls
        expect(await format(`fun test() { foo().bar(); }`)).toMatchSnapshot()
        expect(await format(`fun test() { foo(x).bar(y); }`)).toMatchSnapshot()
    });

    it('should format objects', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Empty objects
        expect(await format(`fun test() { {}; }`)).toMatchSnapshot()

        // Simple objects
        expect(await format(`fun test() { {foo: 1}; }`)).toMatchSnapshot()
        expect(await format(`fun test() { {foo: 1, bar: 2}; }`)).toMatchSnapshot()
        expect(await format(`fun test() { {foo: 1, bar: 2, baz: 3}; }`)).toMatchSnapshot()

        // Objects with type
        expect(await format(`fun test() { MyType{foo: 1}; }`)).toMatchSnapshot()
        expect(await format(`fun test() { MyType{foo: 1, bar: 2}; }`)).toMatchSnapshot()

        // Objects with long fields
        expect(await format(`fun test() { {veryLongFieldName: veryLongValue, anotherLongField: anotherLongValue}; }`, {maxWidth: 30})).toMatchSnapshot()

        // Objects with different argument styles
        expect(await format(`fun test() { {foo}; }`)).toMatchSnapshot()
        expect(await format(`fun test() { {foo:}; }`)).toMatchSnapshot()
        expect(await format(`fun test() { {foo: 1, bar:, baz}; }`)).toMatchSnapshot()

        // Nested objects
        expect(await format(`fun test() { {foo: {bar: 1}}; }`)).toMatchSnapshot()
    });

    it('should format control flow statements', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Return statements
        expect(await format(`fun test() { return; }`)).toMatchSnapshot()
        expect(await format(`fun test() { return 42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { return someVeryLongExpression; }`)).toMatchSnapshot()

        // Break statements
        expect(await format(`fun test() { while (true) { break; } }`)).toMatchSnapshot()

        // Continue statements
        expect(await format(`fun test() { while (true) { continue; } }`)).toMatchSnapshot()

        // Throw statements
        expect(await format(`fun test() { throw 42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { throw (1, 2); }`)).toMatchSnapshot()
        expect(await format(`fun test() { throw someVeryLongExpression; }`)).toMatchSnapshot()
    });

    it('should format loops', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // While loops
        expect(await format(`fun test() { while (true) { break; } }`)).toMatchSnapshot()
        expect(await format(`fun test() { while (condition) { doSomething(); } }`)).toMatchSnapshot()
        expect(await format(`fun test() { while (veryLongCondition) { doSomething(); } }`, {maxWidth: 30})).toMatchSnapshot()

        // Do-while loops
        expect(await format(`fun test() { do { doSomething(); } while (true); }`)).toMatchSnapshot()
        expect(await format(`fun test() { do { doSomething(); } while (condition); }`)).toMatchSnapshot()
        expect(await format(`fun test() { do { doSomething(); } while (veryLongCondition); }`, {maxWidth: 30})).toMatchSnapshot()

        // Repeat loops
        expect(await format(`fun test() { repeat (10) { doSomething(); } }`)).toMatchSnapshot()
        expect(await format(`fun test() { repeat (count) { doSomething(); } }`)).toMatchSnapshot()
        expect(await format(`fun test() { repeat (veryLongCount) { doSomething(); } }`, {maxWidth: 30})).toMatchSnapshot()
    });

    it('should format variables', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Local variable declarations
        expect(await format(`fun test() { var x; }`)).toMatchSnapshot()
        expect(await format(`fun test() { val x; }`)).toMatchSnapshot()
        expect(await format(`fun test() { var x = 42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { val x = 42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { var x: int; }`)).toMatchSnapshot()
        expect(await format(`fun test() { val x: int = 42; }`)).toMatchSnapshot()

        // Variable declarations with redef
        expect(await format(`fun test() { var x redef; }`)).toMatchSnapshot()

        // Tuple variable declarations
        expect(await format(`fun test() { var [x, y] = getTuple(); }`)).toMatchSnapshot()
        expect(await format(`fun test() { val [x: int, y: string] = getTuple(); }`)).toMatchSnapshot()
        expect(await format(`fun test() { var [veryLongVariableName, anotherVeryLongVariableName] = getTuple(); }`, {maxWidth: 30})).toMatchSnapshot()

        // Tensor variable declarations
        expect(await format(`fun test() { var (x, y) = getTensor(); }`)).toMatchSnapshot()
        expect(await format(`fun test() { val (x: int, y: string) = getTensor(); }`)).toMatchSnapshot()
        expect(await format(`fun test() { var (veryLongVariableName, anotherVeryLongVariableName) = getTensor(); }`, {maxWidth: 30})).toMatchSnapshot()
    });

    it('should format functions', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Functions without parameters  
        expect(await format(`fun test() { return 42; }`)).toMatchSnapshot()

        // Functions with parameters
        expect(await format(`fun test(x: int) { return x; }`)).toMatchSnapshot()
        expect(await format(`fun test(x: int, y: string) { return x; }`)).toMatchSnapshot()
        expect(await format(`fun test(x: int, y: string, z: bool) { return x; }`)).toMatchSnapshot()

        // Functions with parameter defaults
        expect(await format(`fun test(x: int = 42) { return x; }`)).toMatchSnapshot()
        expect(await format(`fun test(x: int, y: string = "hello") { return x; }`)).toMatchSnapshot()

        // Functions with mutate parameters
        expect(await format(`fun test(mutate x: int) { return x; }`)).toMatchSnapshot()
        expect(await format(`fun test(x: int, mutate y: string) { return x; }`)).toMatchSnapshot()

        // Functions with return types
        expect(await format(`fun test(): int { return 42; }`)).toMatchSnapshot()
        expect(await format(`fun test(x: int): string { return "hello"; }`)).toMatchSnapshot()

        // Functions with long parameters  
        expect(await format(`fun test(veryLongParameterName: VeryLongTypeName, anotherLongParameter: AnotherLongType): ReturnType { return value; }`, {maxWidth: 30})).toMatchSnapshot()

        // Method declarations
        expect(await format(`fun MyType.test() { return; }`)).toMatchSnapshot()
        expect(await format(`fun MyType.test(x: int): string { return "hello"; }`)).toMatchSnapshot()
        expect(await format(`fun MyType.test(self, x: int): string { return "hello"; }`)).toMatchSnapshot()

        // Get method declarations
        expect(await format(`get test() { return 42; }`)).toMatchSnapshot()
        expect(await format(`get test(): int { return 42; }`)).toMatchSnapshot()
    });

    it('should format top-level declarations', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Tolk required version
        expect(await format(`tolk 0.6`)).toMatchSnapshot()
        expect(await format(`tolk 0.6.0`)).toMatchSnapshot()

        // Import directives
        expect(await format(`import "file.tolk"`)).toMatchSnapshot()
        expect(await format(`import "very/long/path/to/file.tolk"`)).toMatchSnapshot()

        // Global variable declarations
        expect(await format(`global myVar: int`)).toMatchSnapshot()
        expect(await format(`global myVar: VeryLongTypeName`)).toMatchSnapshot()

        // Empty statements
        expect(await format(`fun test() { ; }`)).toMatchSnapshot()
        expect(await format(`fun test() { doSomething(); ; }`)).toMatchSnapshot()

        // Struct declarations
        expect(await format(`struct MyStruct {}`)).toMatchSnapshot()
        expect(await format(`struct MyStruct { x: int }`)).toMatchSnapshot()
        expect(await format(`struct MyStruct { x: int, y: string }`)).toMatchSnapshot()
        expect(await format(`struct MyStruct { x: int = 42, y: string = "hello" }`)).toMatchSnapshot()
        expect(await format(`struct (8) MyStruct { x: int }`)).toMatchSnapshot()
    });

    it('should format advanced expressions', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Set assignment operators
        expect(await format(`fun test() { x += 1; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x -= 1; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x *= 2; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x /= 2; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x %= 3; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x <<= 2; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x >>= 2; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x &= mask; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x |= flag; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x ^= value; }`)).toMatchSnapshot()

        // Set assignment with long expressions
        expect(await format(`fun test() { veryLongVariableName += veryLongExpressionValue; }`, {maxWidth: 30})).toMatchSnapshot()
    });

    it('should format generics', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Type parameters
        expect(await format(`fun test<T>() { return; }`)).toMatchSnapshot()
        expect(await format(`fun test<T, U>() { return; }`)).toMatchSnapshot()
        expect(await format(`fun test<T = int>() { return; }`)).toMatchSnapshot()
        expect(await format(`fun test<T, U = string>() { return; }`)).toMatchSnapshot()
        expect(await format(`fun test<VeryLongTypeName, AnotherLongType>() { return; }`, {maxWidth: 30})).toMatchSnapshot()

        // Generic instantiation
        expect(await format(`fun test() { val x: List<int>; }`)).toMatchSnapshot()
        expect(await format(`fun test() { val x: Map<string, int>; }`)).toMatchSnapshot()
        expect(await format(`fun test() { val x: VeryLongType<VeryLongGenericParameter>; }`, {maxWidth: 30})).toMatchSnapshot()

        // Struct with generics
        expect(await format(`struct MyStruct<T> { value: T }`)).toMatchSnapshot()
        expect(await format(`struct MyStruct<T, U> { first: T, second: U }`)).toMatchSnapshot()
    });

    it('should format annotations', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Simple annotations
        expect(await format(`@annotation fun test() { return; }`)).toMatchSnapshot()
        expect(await format(`@annotation @another fun test() { return; }`)).toMatchSnapshot()

        // Annotations with arguments
        expect(await format(`@annotation() fun test() { return; }`)).toMatchSnapshot()
        expect(await format(`@annotation(42) fun test() { return; }`)).toMatchSnapshot()
        expect(await format(`@annotation(42, "hello") fun test() { return; }`)).toMatchSnapshot()
        expect(await format(`@annotation(veryLongArgument, anotherLongArg) fun test() { return; }`, {maxWidth: 30})).toMatchSnapshot()

        // Annotations on different declarations
        expect(await format(`@annotation global myVar: int`)).toMatchSnapshot()
        expect(await format(`@annotation struct MyStruct { x: int }`)).toMatchSnapshot()
    });

    it('should format advanced types', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Function callable types
        expect(await format(`fun test(callback: int -> string) { return; }`)).toMatchSnapshot()
        expect(await format(`fun test(callback: (int, string) -> bool) { return; }`)).toMatchSnapshot()
        expect(await format(`fun test(callback: VeryLongType -> AnotherLongType) { return; }`, {maxWidth: 30})).toMatchSnapshot()
    });

    it('should format error handling', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Assert statements
        expect(await format(`fun test() { assert(true) throw 1; }`)).toMatchSnapshot()
        expect(await format(`fun test() { assert(condition, 42); }`)).toMatchSnapshot()
        expect(await format(`fun test() { assert(veryLongCondition) throw veryLongException; }`, {maxWidth: 30})).toMatchSnapshot()

        // Try-catch statements
        expect(await format(`fun test() { try { doSomething(); } catch { handleError(); } }`)).toMatchSnapshot()
        expect(await format(`fun test() { try { doSomething(); } catch (e) { handleError(e); } }`)).toMatchSnapshot()
        expect(await format(`fun test() { try { doSomething(); } catch (e, code) { handleError(e, code); } }`)).toMatchSnapshot()
    });

    it('should format pattern matching', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Match expressions
        expect(await format(`fun test() { match(value) {} }`)).toMatchSnapshot()
        expect(await format(`fun test() { match(value) { int => 1, string => 2 } }`)).toMatchSnapshot()
        expect(await format(`fun test() { match(value) { 42 => "number", "hello" => "string", else => "other" } }`)).toMatchSnapshot()

        // Match with blocks
        expect(await format(`fun test() { match(value) { int => { return 1; }, string => { return 2; } } }`)).toMatchSnapshot()
        expect(await format(`fun test() { match(value) { int => return 1, string => throw 2 } }`)).toMatchSnapshot()
    });

    it('should format advanced functions', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // ASM functions
        expect(await format(`fun test() asm "PUSH 42"`)).toMatchSnapshot()
        expect(await format(`fun test() asm "PUSH 42" "ADD"`)).toMatchSnapshot()
        expect(await format(`fun test() asm (x -> 1) "PUSH 42"`)).toMatchSnapshot()

        // Builtin functions
        expect(await format(`fun test() builtin`)).toMatchSnapshot()
    });

    it('should format misc constructs', async () => {
        await initParser(`${__dirname}/../wasm/tree-sitter.wasm`, `${__dirname}/../wasm/tree-sitter-tolk.wasm`)

        // Numeric index access
        expect(await format(`fun test() { x.0; }`)).toMatchSnapshot()
        expect(await format(`fun test() { x.42; }`)).toMatchSnapshot()
        expect(await format(`fun test() { getValue().0; }`)).toMatchSnapshot()
    });

    it('should format block statements', async () => {
        expect(await format(`fun test() {
            val a = 100;
            a = 200;
        }`)).toMatchSnapshot()

        expect(await format(`fun test() {
            val a = 100;
        
            a = 200;
        }`)).toMatchSnapshot()

        expect(await format(`fun test() {
            val a = 100;
        
        
            a = 200;
        }`)).toMatchSnapshot()

        // with comments

        expect(await format(`fun test() {
            // comment here
            val a = 100;
            // and there
            a = 200;
        }`)).toMatchSnapshot()

        expect(await format(`fun test() {
            val a = 100;
            // comment here
            a = 200;
        }`)).toMatchSnapshot()
    })

    it('should format top level declarations', async () => {
        expect(await format(`
        fun foo() {}
        
        fun test() {}
        `)).toMatchSnapshot()

        expect(await format(`
        fun foo() {}
        fun test() {}
        `)).toMatchSnapshot()

        expect(await format(`
        fun foo() {}
        
        
        fun test() {}
        `)).toMatchSnapshot()
    })

    it('should format imports with comments', async () => {
        expect(await format(`
        import "a" // comment after
        `)).toMatchSnapshot()

        expect(await format(`
        // comment before
        import "a"
        `)).toMatchSnapshot()

        // TODO
        expect(await format(`
        import "a"
        // comment after
        `)).toMatchSnapshot()

        expect(await format(`
        import "a"
        // comment between
        import "b"
        `)).toMatchSnapshot()
    })

    it('should format top level declarations with comments', async () => {
        expect(await format(`
        /// function comment
        /// second line
        fun foo() {}
        `)).toMatchSnapshot()

        expect(await format(`
        /// method comment
        /// second line
        fun Foo.foo() {}
        `)).toMatchSnapshot()

        expect(await format(`
        /// struct comment
        /// second line
        struct Foo {}
        `)).toMatchSnapshot()

        expect(await format(`
        /// type alias comment
        /// second line
        type Foo = int
        `)).toMatchSnapshot()

        expect(await format(`
        /// constant comment
        /// second line
        const FOO = 100
        `)).toMatchSnapshot()

        expect(await format(`
        /// global variable comment
        /// second line
        global foo: int
        `)).toMatchSnapshot()
    })
});
