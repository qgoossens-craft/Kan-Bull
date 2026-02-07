import { Editor } from "obsidian";

export class TodoService {
	static extractTaskText(line: string): string {
		// Remove the checkbox prefix: "- [ ] ", "- [x] ", etc.
		return line.replace(/^\s*- \[.\]\s*/, "").trim();
	}

	static deleteLineFromEditor(editor: Editor, lineNumber: number): void {
		const from = { line: lineNumber, ch: 0 };
		const isLastLine = lineNumber === editor.lastLine();

		if (isLastLine && lineNumber > 0) {
			// If last line, also remove the preceding newline
			const prevLineLength = editor.getLine(lineNumber - 1).length;
			editor.replaceRange("", { line: lineNumber - 1, ch: prevLineLength }, { line: lineNumber, ch: editor.getLine(lineNumber).length });
		} else {
			const to = { line: lineNumber + 1, ch: 0 };
			editor.replaceRange("", from, to);
		}
	}

	/** Delete multiple lines — sorted descending to preserve line numbers */
	static deleteLinesFromEditor(editor: Editor, lineNumbers: number[]): void {
		const sorted = [...lineNumbers].sort((a, b) => b - a);
		for (const ln of sorted) {
			this.deleteLineFromEditor(editor, ln);
		}
	}
}
