import { App, Modal } from "obsidian";
import type KanBullPlugin from "../main";
import type { Ticket } from "../models/types";
import { confirmDialog } from "./ConfirmModal";
import { CustomSelect } from "./CustomSelect";

export class TicketModal extends Modal {
	private plugin: KanBullPlugin;
	private projectId: string;
	private colId: string;
	private ticket: Ticket;
	private isNew: boolean;
	private onBoardRefresh: () => Promise<void>;
	private titleInput!: HTMLInputElement;
	private descInput!: HTMLTextAreaElement;
	private colSelect: CustomSelect | null = null;
	private saved = false;

	constructor(
		app: App,
		plugin: KanBullPlugin,
		projectId: string,
		colId: string,
		ticket: Ticket,
		onBoardRefresh: () => Promise<void>,
		isNew = false,
	) {
		super(app);
		this.plugin = plugin;
		this.projectId = projectId;
		this.colId = colId;
		this.ticket = ticket;
		this.onBoardRefresh = onBoardRefresh;
		this.isNew = isNew;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("kan-bull-ticket-modal");

		// ── Title field ──
		this.titleInput = contentEl.createEl("input", {
			type: "text",
			value: this.isNew ? "" : this.ticket.title,
			cls: "kan-bull-modal-title-input",
			placeholder: "Ticket title",
		});

		// ── Body ──
		const body = contentEl.createDiv({ cls: "kan-bull-modal-body" });

		// Description field group
		const descGroup = body.createDiv({ cls: "kan-bull-modal-field" });
		descGroup.createEl("label", { text: "Description", cls: "kan-bull-modal-label" });
		this.descInput = descGroup.createEl("textarea", {
			cls: "kan-bull-modal-desc-input",
			placeholder: "Add a description...",
		});
		this.descInput.value = this.ticket.description;
		this.descInput.rows = 5;

		// Column + source — only shown when editing existing tickets
		if (!this.isNew) {
			const sidebar = body.createDiv({ cls: "kan-bull-modal-sidebar" });

			const colGroup = sidebar.createDiv({ cls: "kan-bull-modal-field" });
			colGroup.createEl("label", { text: "Column", cls: "kan-bull-modal-label" });
			const project = this.plugin.dataService.getProject(this.projectId);
			const colOptions = project
				? project.columns.map((col) => ({ value: col.id, label: col.name }))
				: [];
			this.colSelect = new CustomSelect(colGroup, colOptions, this.colId);

			if (this.ticket.sourceNote) {
				const sourceGroup = sidebar.createDiv({ cls: "kan-bull-modal-field" });
				sourceGroup.createEl("label", { text: "Source", cls: "kan-bull-modal-label" });
				const sourceLink = sourceGroup.createEl("a", {
					text: this.ticket.sourceNote,
					cls: "kan-bull-modal-source-link",
				});
				sourceLink.addEventListener("click", (e) => {
					e.preventDefault();
					if (this.ticket.sourceNote) {
						this.app.workspace.openLinkText(this.ticket.sourceNote, "");
						this.close();
					}
				});
			}
		}

		// ── Footer ──
		const footer = contentEl.createDiv({ cls: "kan-bull-modal-footer" });
		const deleteBtn = footer.createEl("button", {
			text: "Delete",
			cls: "kan-bull-delete-btn",
		});
		deleteBtn.addEventListener("click", async () => {
			const ok = await confirmDialog(
				this.app,
				`Delete ticket "${this.ticket.title}"?`,
			);
			if (!ok) return;
			await this.plugin.dataService.deleteTicket(this.projectId, this.colId, this.ticket.id);
			this.saved = true; // prevent onClose from re-saving
			this.close();
			await this.onBoardRefresh();
		});

		// ── Keyboard handling ──
		this.titleInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.saveAndClose();
			}
			// Tab is handled natively — moves focus to description
		});

		this.descInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.saveAndClose();
			}
			// Shift+Enter adds a newline (default textarea behavior)
		});

		// Focus title on open
		setTimeout(() => {
			this.titleInput.focus();
			if (!this.isNew) {
				this.titleInput.select();
			}
		}, 10);
	}

	private async saveAndClose(): Promise<void> {
		const title = this.titleInput?.value.trim();
		if (!title) {
			// No title — if new ticket, delete it; otherwise just close
			if (this.isNew) {
				await this.plugin.dataService.deleteTicket(this.projectId, this.colId, this.ticket.id);
			}
			this.saved = true;
			this.close();
			await this.onBoardRefresh();
			return;
		}

		const desc = this.descInput?.value ?? "";
		const newColId = this.colSelect?.getValue() ?? this.colId;

		// Update ticket content
		await this.plugin.dataService.updateTicket(
			this.projectId,
			this.colId,
			this.ticket.id,
			{ title, description: desc },
		);

		// Move column if changed (edit mode only)
		if (newColId !== this.colId) {
			const toCol = this.plugin.dataService.getColumn(this.projectId, newColId);
			const position = toCol ? toCol.tickets.length : 0;
			await this.plugin.dataService.moveTicket(
				this.projectId,
				this.ticket.id,
				this.colId,
				newColId,
				position,
			);
		}

		this.saved = true;
		this.close();
		await this.onBoardRefresh();
	}

	async onClose(): Promise<void> {
		if (!this.saved) {
			// Auto-save on close (clicking X or pressing Escape)
			const newTitle = this.titleInput?.value.trim();

			if (!newTitle && this.isNew) {
				// Empty new ticket — clean it up
				await this.plugin.dataService.deleteTicket(this.projectId, this.colId, this.ticket.id);
				await this.onBoardRefresh();
			} else if (newTitle) {
				const newDesc = this.descInput?.value ?? "";
				const newColId = this.colSelect?.getValue() ?? this.colId;
				let changed = false;

				if (newTitle !== this.ticket.title || newDesc !== this.ticket.description) {
					await this.plugin.dataService.updateTicket(
						this.projectId,
						this.colId,
						this.ticket.id,
						{ title: newTitle, description: newDesc },
					);
					changed = true;
				}

				if (newColId !== this.colId) {
					const toCol = this.plugin.dataService.getColumn(this.projectId, newColId);
					const position = toCol ? toCol.tickets.length : 0;
					await this.plugin.dataService.moveTicket(
						this.projectId,
						this.ticket.id,
						this.colId,
						newColId,
						position,
					);
					changed = true;
				}

				if (changed) {
					await this.onBoardRefresh();
				}
			}
		}

		this.contentEl.empty();
	}
}
