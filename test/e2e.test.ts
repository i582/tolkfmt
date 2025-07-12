import {join, normalize} from "path"
import {runCommand} from "./utils/test-util"
import {readFileSync, rmSync, writeFileSync} from "fs"
import {mkdir} from "fs/promises"

// disable tests on windows
const testExceptWindows = process.platform === "win32" && process.env["CI"] ? test.skip : test

const tolkfmt = (...args: string[]) => {
    const tolkfmtPath = normalize(join(__dirname, "..", "bin", "tolkfmt"))
    const command = `node ${tolkfmtPath} ${args.join(" ")}`
    return runCommand(command)
}

const outputDir = join(__dirname, "output")

const goodContract = `
fun test(x: int, y: string): string {
    return x + y
}
`

const badContract = `
fun   test(  x: int,y:string   ): string{
return    x+y;
}
`

const contractWithSyntaxError = `
fun test(x: int, y: string): string {
    return foo("hello world";
}
`

const structCode = `
struct MyStruct {
    x: int = 42,
    y: string = "hello"
}
`

describe("tolkfmt foo.tolk", () => {
    testExceptWindows("Exits with correct code", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, goodContract)
        const result = await tolkfmt(file)
        expect(result).toMatchObject({kind: "exited", code: 0})

        rmSync(file)
    })

    testExceptWindows("Default run", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, goodContract)
        const result = await tolkfmt(file)
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Default run with write to file", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, badContract)
        await tolkfmt(file, "-w")

        const newContent = readFileSync(file, "utf8")
        expect(newContent).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Run on directory", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        // inner
        //   file1.tolk
        //   inner-2
        //      file2.tolk
        //      file3.tolk
        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {   }")
        writeFileSync(file2, "fun foo2() {  }")
        writeFileSync(file3, "fun foo3() {     }")

        await tolkfmt(innerDir, "-w")

        expect(readFileSync(file1, "utf8")).toMatchSnapshot()
        expect(readFileSync(file2, "utf8")).toMatchSnapshot()
        expect(readFileSync(file3, "utf8")).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on directory with formatted files", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {}\n")
        writeFileSync(file2, "fun foo2() {}\n")
        writeFileSync(file3, "fun foo3() {}\n")

        const result = await tolkfmt(innerDir, "--check")
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on directory with not formatted files", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {  }\n")
        writeFileSync(file2, "fun foo2() {  }\n")
        writeFileSync(file3, "fun foo3() {  }\n")

        const result = await tolkfmt(innerDir, "--check")
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on several formatted files", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {}\n")
        writeFileSync(file2, "fun foo2() {  }\n") // not checked
        writeFileSync(file3, "fun foo3() {}\n")

        const result = await tolkfmt("--check", file1, file3)
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on several directories", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")
        const innerInnerDir2 = join(innerDir, "inner-3")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})
        await mkdir(innerInnerDir2, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir2, "file3.tolk")

        writeFileSync(file1, "fun foo1() { }\n") // not checked
        writeFileSync(file2, "fun foo2() {  }\n")
        writeFileSync(file3, "fun foo3() {}\n")

        const result = await tolkfmt("--check", innerInnerDir, innerInnerDir2)
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("With syntax error", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, contractWithSyntaxError)
        const result = await tolkfmt(file, "-w")

        // Check status without timing details
        expect(result.kind).toBe("exited")
        if (result.kind === "exited") {
            expect(result.code).toBe(0)
            expect(result.stderr).toBe("")
            expect(result.stdout).toMatch(/contract\.tolk \d+ms \(reformatted\)/)
        }

        rmSync(file)
    })

    testExceptWindows("Check and write flags simultaneously", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, badContract)
        const result = await tolkfmt(file, "-w", "--check")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Format struct", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "struct.tolk")
        writeFileSync(file, structCode)
        const result = await tolkfmt(file)
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Version flag", async () => {
        const result = await tolkfmt("--version")
        expect(result).toMatchSnapshot()
    })

    testExceptWindows("Help flag", async () => {
        const result = await tolkfmt("--help")
        expect(result).toMatchSnapshot()
    })

    testExceptWindows("No arguments", async () => {
        const result = await tolkfmt()
        expect(result).toMatchSnapshot()
    })
})
