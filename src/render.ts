import {Doc} from "./doc";

export function render(doc: Doc, printWidth: number = 80): string {
    type Mode = "flat" | "break";

    interface Frame {
        doc: Doc;
        mode: Mode;
        indent: number;
    }

    const out: string[] = [];
    const lineSuffix: Doc[] = [];          // очередь suffix'ов к концу физ. строки
    const stack: Frame[] = [{doc, mode: "break", indent: 0}];

    function fits(d: Doc, w: number): boolean {
        const fitStack: Doc[] = [d];
        let width = w;

        while (width >= 0 && fitStack.length) {
            const cur = fitStack.pop()!;
            switch (cur.$) {
                case "Text":
                    width -= cur.value.length;
                    break;
                case "Line":
                    width -= 1;            // станет пробелом в «flat»
                    break;
                case "SoftLine":
                    // превращается в «ничего» в flat-режиме
                    break;
                case "HardLine":
                    return true;           // в плоском режиме hardline невозможен
                case "Concat":
                    for (let i = cur.parts.length - 1; i >= 0; i--) {
                        fitStack.push(cur.parts[i]);
                    }
                    break;
                case "Indent":
                    fitStack.push(cur.content);
                    break;
                case "Group":
                    fitStack.push(cur.content); // группа внутри flat => тоже flat
                    break;
                case "LineSuffix":
                    fitStack.push(cur.suffix);
                    break;
                case "BreakParent":
                    return true;           // вынудит разрыв, значит не влезает
            }
        }
        return width >= 0;
    }

    // ---------------------------------------------------------------------------
    // Главный цикл
    while (stack.length) {
        const {doc: cur, mode, indent} = stack.pop()!;

        switch (cur.$) {
            case "Text":
                out.push(cur.value);
                break;

            case "Line":
                if (mode === "flat") {
                    out.push(" ");
                } else {
                    flushLineSuffix();
                    out.push("\n", " ".repeat(indent));
                }
                break;

            case "SoftLine":
                if (mode !== "flat") {
                    flushLineSuffix();
                    out.push("\n", " ".repeat(indent));
                }
                break;

            case "HardLine":
                flushLineSuffix();
                out.push("\n", " ".repeat(indent));
                break;

            case "Concat":
                for (let i = cur.parts.length - 1; i >= 0; i--) {
                    stack.push({doc: cur.parts[i], mode, indent});
                }
                break;

            case "Indent":
                stack.push({doc: cur.content, mode, indent: indent + cur.indent});
                break;

            case "Group": {
                const shouldFlat = fits(cur.content, printWidth - currentColumn(out) - indent);
                stack.push({doc: cur.content, mode: shouldFlat ? "flat" : "break", indent});
                break;
            }

            case "LineSuffix":
                lineSuffix.push(cur.suffix);
                break;

            case "BreakParent":
                // Сигнал вверх: превращаем текущий режим в break
                // (Алгоритм: просто вставляем hardline прямо здесь.)
                flushLineSuffix();
                out.push("\n", " ".repeat(indent));
                break;
        }
    }

    return out.join("");

    // ---------------------------------------------------------------------------
    // helpers
    function currentColumn(buf: string[]): number {
        let col = 0;

        // идём от конца массива; так трогаем только куски последней строки
        for (let i = buf.length - 1; i >= 0; i--) {
            const piece = buf[i];
            const nl = piece.lastIndexOf("\n");

            if (nl !== -1) {
                // в кусочке есть перевод строки: всё, столбец найден
                return col + piece.length - nl - 1;
            }
            col += piece.length;       // на строке нет \n, прибавляем всю длину
        }
        return col;                    // \n не нашли — значит, одна-единственная строка
    }

    function flushLineSuffix() {
        while (lineSuffix.length) {
            const suffix = lineSuffix.shift()!;
            stack.push({doc: suffix, mode: "flat", indent: 0}); // suffix → выводим немедленно
        }
    }
}
