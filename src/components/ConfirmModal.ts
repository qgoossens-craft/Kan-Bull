import { App, Modal } from "obsidian";

export class ConfirmModal extends Modal {
	private message: string;
	private confirmText: string;
	private cancelText: string;
	private resolved = false;
	private resolvePromise: (value: boolean) => void = () => {};

	constructor(
		app: App,
		message: string,
		confirmText = "Delete",
		cancelText = "Cancel",
	) {
		super(app);
		this.message = message;
		this.confirmText = confirmText;
		this.cancelText = cancelText;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("kan-bull-confirm-modal");

		contentEl.createEl("p", {
			text: this.message,
			cls: "kan-bull-confirm-message",
		});

		const actions = contentEl.createDiv({ cls: "kan-bull-confirm-actions" });

		const cancelBtn = actions.createEl("button", {
			text: this.cancelText,
			cls: "kan-bull-confirm-cancel",
		});
		cancelBtn.addEventListener("click", () => {
			this.resolved = true;
			this.resolvePromise(false);
			this.close();
		});

		const confirmBtn = actions.createEl("button", {
			text: this.confirmText,
			cls: "kan-bull-confirm-ok mod-warning",
		});
		confirmBtn.addEventListener("click", () => {
			this.resolved = true;
			this.resolvePromise(true);
			this.close();
		});

		// Focus the cancel button by default (safe choice)
		cancelBtn.focus();
	}

	onClose(): void {
		if (!this.resolved) {
			this.resolvePromise(false);
		}
		this.contentEl.empty();
	}

	async waitForResult(): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			this.resolvePromise = resolve;
		});
	}
}

/** Helper: open a styled confirm dialog and return the user's choice. */
export async function confirmDialog(
	app: App,
	message: string,
	confirmText = "Delete",
	cancelText = "Cancel",
): Promise<boolean> {
	const modal = new ConfirmModal(app, message, confirmText, cancelText);
	const promise = modal.waitForResult();
	modal.open();
	return promise;
}
