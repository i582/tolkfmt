import {exec} from "child_process"
import {promisify} from "util"

const execAsync = promisify(exec)

export interface ExitedResult {
    readonly kind: "exited"
    readonly code: number
    readonly stdout: string
    readonly stderr: string
}

export interface KilledResult {
    readonly kind: "killed"
    readonly signal: string
    readonly stdout: string
    readonly stderr: string
}

export type CommandResult = ExitedResult | KilledResult

export async function runCommand(command: string): Promise<CommandResult> {
    try {
        const {stdout, stderr} = await execAsync(command)
        return {
            kind: "exited",
            code: 0,
            stdout,
            stderr,
        }
    } catch (error: any) {
        if (error.code !== undefined) {
            return {
                kind: "exited",
                code: error.code,
                stdout: error.stdout || "",
                stderr: error.stderr || "",
            }
        } else if (error.signal !== undefined) {
            return {
                kind: "killed",
                signal: error.signal,
                stdout: error.stdout || "",
                stderr: error.stderr || "",
            }
        } else {
            throw error
        }
    }
}
