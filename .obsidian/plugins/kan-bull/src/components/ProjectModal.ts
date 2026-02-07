import { App, Modal } from "obsidian";

export class ProjectModal extends Modal {
	private onSubmit: (name: string) => Promise<void>;

	constructor(app: App, onSubmit: (name: string) => Promise<void>) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("kan-bull-project-modal");

		contentEl.createEl("h3", { text: "New Project" });

		const input = contentEl.createEl("input", {
			type: "text",
			placeholder: "Project name",
			cls: "kan-bull-modal-title-input",
		});
		input.focus();

		const submit = async () => {
			const name = input.value.trim();
			if (!name) return;
			this.close();
			await this.onSubmit(name);
		};

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				e.stopPropagation();
				submit();
			}
			if (e.key === "Escape") this.close();
		});

		const actions = contentEl.createDiv({ cls: "kan-bull-modal-actions" });
		const btn = actions.createEl("button", { text: "Create", cls: "mod-cta" });
		btn.addEventListener("click", submit);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
