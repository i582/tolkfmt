import {cac} from 'cac';
import * as fs from 'fs';
import * as path from 'path';
import {glob} from 'glob';
import {format} from './index';

const version = '0.0.2';

type FormatMode = 'format' | 'format-and-write' | 'check';

async function formatFile(filepath: string, mode: FormatMode): Promise<boolean | undefined> {
    const content = readFileOrFail(filepath);
    if (typeof content === 'undefined') return undefined;

    try {
        const [formattedCode, time] = await measureTime(async () => {
            return await format(content, {maxWidth: 100});
        });

        const alreadyFormatted = content === formattedCode;

        if (mode === 'check') {
            if (alreadyFormatted) {
                return true;
            }
            console.log(`[warn]`, path.basename(filepath));
            return false;
        }

        if (mode === 'format-and-write') {
            console.log(
                path.basename(filepath),
                `${time.toFixed(0)}ms`,
                status(content, formattedCode),
            );
            fs.writeFileSync(filepath, formattedCode);
            return alreadyFormatted;
        } else {
            process.stdout.write(formattedCode);
            return alreadyFormatted;
        }
    } catch (error) {
        console.error(
            `Cannot format file ${path.relative(process.cwd(), filepath)}:`,
            (error as Error).message,
        );
        return undefined;
    }
}

function status(before: string, after: string) {
    if (before !== after) {
        return '(reformatted)';
    }
    return '(unchanged)';
}

async function measureTime<T>(fn: () => Promise<T>): Promise<[T, number]> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const time = endTime - startTime;
    return [result, time];
}

function readFileOrFail(filePath: string): string | undefined {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        const error = e as Error;
        console.error(`Cannot read file: ${error.message}`);
        return undefined;
    }
}

function collectFilesToFormat(paths: string[]): string[] {
    return paths.flatMap((inputPath) => {
        if (!fs.existsSync(inputPath)) {
            console.error(`Path does not exist: ${inputPath}`);
            return [];
        }

        if (!fs.statSync(inputPath).isFile()) {
            // for directory, find all .tolk files
            return glob.sync('**/*.tolk', {cwd: inputPath}).map((file) =>
                path.join(inputPath, file),
            );
        } else {
            return inputPath;
        }
    });
}

export async function main() {
    const cli = cac('tolkfmt');

    cli
        .version(version)
        .usage('[options] <files or directories>')
        .option('-w, --write', 'Write result to same file')
        .option('-c, --check', 'Check if the given files are formatted')
        .help();

    const parsed = cli.parse();
    const {write, check} = parsed.options;
    const filePaths = parsed.args;

    if (write && check) {
        console.error('Error: Cannot use both --write and --check options together');
        process.exit(1);
    }

    if (filePaths.length === 0) {
        return;
    }

    const mode: FormatMode = check ? 'check' : write ? 'format-and-write' : 'format';

    if (mode === 'check') {
        console.log('Checking formatting...');
    }

    const filesToFormat = collectFilesToFormat([...filePaths]);

    if (filesToFormat.length === 0) {
        console.error('No .tolk files found');
        process.exit(1);
    }

    let someFileCannotBeFormatted = false;
    let allFormatted = true;

    for (const file of filesToFormat) {
        const res = await formatFile(file, mode);
        if (typeof res === 'undefined') {
            someFileCannotBeFormatted = true;
        } else {
            allFormatted &&= res;
        }
    }

    if (check) {
        if (!allFormatted) {
            console.log(
                'Code style issues found in the above files. Run tolkfmt with --write to fix.',
            );
            process.exit(1);
        } else {
            console.log('All Tolk files are properly formatted!');
        }
    }

    if (someFileCannotBeFormatted) {
        process.exit(1);
    }
}

process.on('uncaughtException', (error) => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    process.exit(1);
});
