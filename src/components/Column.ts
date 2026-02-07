import { Menu } from "obsidian";
import type KanBullPlugin from "../main";
import type { Column } from "../models/types";
import { confirmDialog } from "./ConfirmModal";
import { TicketCard } from "./TicketCard";
import { TicketModal } from "./TicketModal";

export class ColumnComponent {
	private parentEl: HTMLElement;
	private plugin: KanBullPlugin;
	private projectId: string;
	private column: Column;
	private onBoardRefresh: () => Promise<void>;
	private el: HTMLElement | null = null;
	private ticketCards: TicketCard[] = [];

	constructor(
		parentEl: HTMLElement,
		plugin: KanBullPlugin,
		projectId: string,
		column: Column,
		onBoardRefresh: () => Promise<void>,
	) {
		this.parentEl = parentEl;
		this.plugin = plugin;
		this.projectId = projectId;
		this.column = column;
		this.onBoardRefresh = onBoardRefresh;
	}

	render(): void {
		this.el = this.parentEl.createDiv({ cls: "kan-bull-column" });
		this.el.dataset.columnId = this.column.id;

		this.renderHeader();
		this.renderTickets();
		this.renderAddButton();
		this.setupDropZone();
	}

	private renderHeader(): void {
		if (!this.el) return;
		const header = this.el.createDiv({ cls: "kan-bull-column-header" });
		const titleEl = header.createSpan({
			text: this.column.name,
			cls: "kan-bull-column-title",
		});

		const countEl = header.createSpan({
			text: String(this.column.tickets.length),
			cls: "kan-bull-column-count",
		});

		// Double-click to rename
		titleEl.addEventListener("dblclick", () => {
			const input = document.createElement("input");
			input.type = "text";
			input.value = this.column.name;
			input.className = "kan-bull-inline-input";
			titleEl.replaceWith(input);
			input.focus();
			input.select();

			const commit = async () => {
				const newName = input.value.trim();
				if (newName && newName !== this.column.name) {
					await this.plugin.dataService.renameColumn(this.projectId, this.column.id, newName);
				}
				await this.onBoardRefresh();
			};

			input.addEventListener("blur", commit);
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") { input.blur(); }
				if (e.key === "Escape") {
					input.value = this.column.name;
					input.blur();
				}
			});
		});

		// Right-click context menu
		header.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			const menu = new Menu();

			menu.addItem((item) => {
				item.setTitle("Add ticket").setIcon("plus").onClick(async () => {
					const ticket = await this.plugin.dataService.addTicket(
						this.projectId,
						this.column.id,
						"New ticket",
					);
					if (!ticket) return;
					new TicketModal(
						this.plugin.app,
						this.plugin,
						this.projectId,
						this.column.id,
						ticket,
						this.onBoardRefresh,
						true,
					).open();
				});
			});

			menu.addSeparator();

			menu.addItem((item) => {
				item.setTitle("Rename").setIcon("pencil").onClick(() => {
					titleEl.dispatchEvent(new MouseEvent("dblclick"));
				});
			});

			const project = this.plugin.dataService.getProject(this.projectId);
			if (project) {
				const colIndex = project.columns.findIndex((c) => c.id === this.column.id);

				if (colIndex > 0) {
					menu.addItem((item) => {
						item.setTitle("Move left").setIcon("arrow-left").onClick(async () => {
							await this.plugin.dataService.reorderColumns(this.projectId, colIndex, colIndex - 1);
							await this.onBoardRefresh();
						});
					});
				}

				if (colIndex < project.columns.length - 1) {
					menu.addItem((item) => {
						item.setTitle("Move right").setIcon("arrow-right").onClick(async () => {
							await this.plugin.dataService.reorderColumns(this.projectId, colIndex, colIndex + 1);
							await this.onBoardRefresh();
						});
					});
				}
			}

			menu.addSeparator();
			menu.addItem((item) => {
				item.setTitle("Delete column").setIcon("trash").onClick(async () => {
					if (this.column.tickets.length > 0) {
						const ok = await confirmDialog(
							this.plugin.app,
							`Delete column "${this.column.name}" and its ${this.column.tickets.length} ticket(s)?`,
						);
						if (!ok) return;
					}
					await this.plugin.dataService.deleteColumn(this.projectId, this.column.id);
					await this.onBoardRefresh();
				});
			});

			menu.showAtMouseEvent(e);
		});
	}

	private renderTickets(): void {
		if (!this.el) return;
		const list = this.el.createDiv({ cls: "kan-bull-ticket-list" });

		// Right-click on empty area of column body → create ticket + open modal directly
		list.addEventListener("contextmenu", async (e) => {
			if ((e.target as HTMLElement).closest(".kan-bull-ticket-card")) return;
			e.preventDefault();
			const ticket = await this.plugin.dataService.addTicket(
				this.projectId,
				this.column.id,
				"New ticket",
			);
			if (!ticket) return;
			new TicketModal(
				this.plugin.app,
				this.plugin,
				this.projectId,
				this.column.id,
				ticket,
				this.onBoardRefresh,
				true,
			).open();
		});

		this.ticketCards = this.column.tickets.map(
			(ticket) =>
				new TicketCard(
					list,
					this.plugin,
					this.projectId,
					this.column.id,
					ticket,
					this.onBoardRefresh,
				),
		);

		for (const card of this.ticketCards) {
			card.render();
		}
	}

	private renderAddButton(): void {
		if (!this.el) return;
		const addBtn = this.el.createDiv({ cls: "kan-bull-add-ticket" });
		addBtn.createSpan({ text: "+ Add" });

		addBtn.addEventListener("click", () => {
			// Replace button with inline input
			addBtn.empty();
			const input = addBtn.createEl("input", {
				type: "text",
				placeholder: "Ticket title...",
				cls: "kan-bull-inline-input",
			});
			input.focus();

			const commit = async () => {
				const title = input.value.trim();
				if (title) {
					await this.plugin.dataService.addTicket(this.projectId, this.column.id, title);
					await this.onBoardRefresh();
				} else {
					await this.onBoardRefresh();
				}
			};

			input.addEventListener("blur", commit);
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") { input.blur(); }
				if (e.key === "Escape") {
					input.value = "";
					input.blur();
				}
			});
		});
	}

	private setupDropZone(): void {
		if (!this.el) return;
		const list = this.el.querySelector(".kan-bull-ticket-list") as HTMLElement;
		if (!list) return;

		list.addEventListener("dragover", (e) => {
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
			list.addClass("kan-bull-drop-active");

			// Determine insertion point
			const afterElement = this.getDragAfterElement(list, e.clientY);
			const dragging = list.querySelector(".kan-bull-dragging");
			if (!dragging) return;

			if (afterElement) {
				list.insertBefore(dragging, afterElement);
			} else {
				list.appendChild(dragging);
			}
		});

		list.addEventListener("dragleave", (e) => {
			// Only remove highlight if leaving the list entirely
			if (!list.contains(e.relatedTarget as Node)) {
				list.removeClass("kan-bull-drop-active");
			}
		});

		list.addEventListener("drop", async (e) => {
			e.preventDefault();
			list.removeClass("kan-bull-drop-active");

			const ticketId = e.dataTransfer?.getData("text/plain");
			const fromColId = e.dataTransfer?.getData("application/kan-bull-col");
			if (!ticketId || !fromColId) return;

			// Calculate position based on where the card was dropped
			const cards = Array.from(list.querySelectorAll(".kan-bull-ticket-card:not(.kan-bull-dragging)"));
			const dragging = list.querySelector(".kan-bull-dragging");
			let position = 0;
			if (dragging) {
				const allCards = Array.from(list.querySelectorAll(".kan-bull-ticket-card"));
				position = allCards.indexOf(dragging);
				if (position === -1) position = cards.length;
			}

			await this.plugin.dataService.moveTicket(
				this.projectId,
				ticketId,
				fromColId,
				this.column.id,
				position,
			);
			await this.onBoardRefresh();
		});
	}

	private getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
		const draggables = Array.from(
			container.querySelectorAll(".kan-bull-ticket-card:not(.kan-bull-dragging)"),
		) as HTMLElement[];

		let closest: { offset: number; element: HTMLElement | null } = {
			offset: Number.POSITIVE_INFINITY,
			element: null,
		};

		for (const child of draggables) {
			const box = child.getBoundingClientRect();
			const offset = y - box.top - box.height / 2;
			if (offset < 0 && offset > -closest.offset) {
				closest = { offset: -offset, element: child };
			}
		}

		return closest.element;
	}

	destroy(): void {
		this.ticketCards = [];
		this.el?.remove();
		this.el = null;
	}
}
