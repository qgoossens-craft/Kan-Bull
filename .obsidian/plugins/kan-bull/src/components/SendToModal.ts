import { App, Editor, Modal } from "obsidian";
import type KanBullPlugin from "../main";
import { TodoService } from "../services/TodoService";
import { CustomSelect } from "./CustomSelect";

export interface TodoTask {
	lineNumber: number;
	text: string;
}

export class SendToModal extends Modal {
	private plugin: KanBullPlugin;
	private editor: Editor;
	private tasks: TodoTask[];

	constructor(app: App, plugin: KanBullPlugin, editor: Editor, tasks: TodoTask[]) {
		super(app);
		this.plugin = plugin;
		this.editor = editor;
		this.tasks = tasks;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("kan-bull-send-modal");

		const isBatch = this.tasks.length > 1;
		contentEl.createEl("h3", {
			text: isBatch ? `Send ${this.tasks.length} tasks to Kan-Bull` : "Send to Kan-Bull",
		});

		const projects = this.plugin.dataService.getProjects();

		if (projects.length === 0) {
			contentEl.createEl("p", { text: "No projects exist. Create a project first." });
			return;
		}

		// Project dropdown
		const projLabel = contentEl.createEl("label", { text: "Project" });
		projLabel.addClass("kan-bull-modal-label");
		const projOptions = projects.map((p) => ({ value: p.id, label: p.name }));

		// Column dropdown (updates when project changes)
		const colLabel = contentEl.createEl("label", { text: "Column" });
		colLabel.addClass("kan-bull-modal-label");

		let colSelect: CustomSelect;

		const populateColumns = (projectId: string) => {
			const project = this.plugin.dataService.getProject(projectId);
			if (!project) return;
			const colOptions = project.columns.map((col) => ({ value: col.id, label: col.name }));
			colSelect.setOptions(colOptions);
		};

		const projSelect = new CustomSelect(contentEl, projOptions, projects[0].id, (val) => {
			populateColumns(val);
		});

		contentEl.appendChild(colLabel);

		const firstProject = this.plugin.dataService.getProject(projects[0].id);
		const initialColOptions = firstProject
			? firstProject.columns.map((col) => ({ value: col.id, label: col.name }))
			: [];
		colSelect = new CustomSelect(contentEl, initialColOptions, initialColOptions[0]?.value ?? "");

		// Task list with checkboxes (batch) or single title input
		const taskCheckboxes: { task: TodoTask; checkbox: HTMLInputElement; titleInput: HTMLInputElement }[] = [];

		if (isBatch) {
			const taskListLabel = contentEl.createEl("label", { text: "Tasks" });
			taskListLabel.addClass("kan-bull-modal-label");
			const taskList = contentEl.createDiv({ cls: "kan-bull-send-task-list" });

			for (const task of this.tasks) {
				const row = taskList.createDiv({ cls: "kan-bull-send-task-row" });

				const checkbox = row.createEl("input", { type: "checkbox" }) as HTMLInputElement;
				checkbox.checked = true;
				checkbox.addClass("kan-bull-send-task-check");

				const titleInput = row.createEl("input", {
					type: "text",
					value: TodoService.extractTaskText(task.text),
					cls: "kan-bull-send-task-title",
				});

				taskCheckboxes.push({ task, checkbox, titleInput });
			}

			// Select all / none toggle
			const toggleRow = contentEl.createDiv({ cls: "kan-bull-send-toggle-row" });
			const selectAllBtn = toggleRow.createEl("button", { text: "All", cls: "kan-bull-send-toggle-btn" });
			const selectNoneBtn = toggleRow.createEl("button", { text: "None", cls: "kan-bull-send-toggle-btn" });

			selectAllBtn.addEventListener("click", () => {
				for (const tc of taskCheckboxes) tc.checkbox.checked = true;
			});
			selectNoneBtn.addEventListener("click", () => {
				for (const tc of taskCheckboxes) tc.checkbox.checked = false;
			});
		} else {
			// Single task — editable title
			const titleLabel = contentEl.createEl("label", { text: "Title" });
			titleLabel.addClass("kan-bull-modal-label");
			const titleInput = contentEl.createEl("input", {
				type: "text",
				value: TodoService.extractTaskText(this.tasks[0].text),
				cls: "kan-bull-modal-title-input",
			});
			taskCheckboxes.push({
				task: this.tasks[0],
				checkbox: { checked: true } as HTMLInputElement,
				titleInput,
			});
		}

		// Actions
		const actions = contentEl.createDiv({ cls: "kan-bull-modal-actions" });
		const submitBtn = actions.createEl("button", {
			text: isBatch ? `Send selected` : "Send",
			cls: "mod-cta",
		});

		const submit = async () => {
			const projectId = projSelect.getValue();
			const colId = colSelect.getValue();
			const file = this.app.workspace.getActiveFile();
			const sourceNote = file?.path ?? null;

			const selected = taskCheckboxes.filter((tc) => tc.checkbox.checked);
			if (selected.length === 0) return;

			// Create tickets
			for (const tc of selected) {
				const title = tc.titleInput.value.trim();
				if (!title) continue;
				await this.plugin.dataService.addTicket(projectId, colId, title, "", sourceNote);
			}

			// Delete lines from editor (bottom-to-top)
			const lineNumbers = selected.map((tc) => tc.task.lineNumber);
			TodoService.deleteLinesFromEditor(this.editor, lineNumbers);

			this.close();

			// Refresh the board if open
			const view = this.plugin.getView();
			if (view) await view.refresh();
		};

		submitBtn.addEventListener("click", submit);

		// Enter to submit on single-task mode
		if (!isBatch) {
			taskCheckboxes[0].titleInput.addEventListener("keydown", (e) => {
				if (e.key === "Enter") submit();
				if (e.key === "Escape") this.close();
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
