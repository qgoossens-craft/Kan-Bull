import type KanBullPlugin from "../main";
import type { Ticket } from "../models/types";
import { confirmDialog } from "./ConfirmModal";
import { TicketModal } from "./TicketModal";

export class TicketCard {
	private parentEl: HTMLElement;
	private plugin: KanBullPlugin;
	private projectId: string;
	private colId: string;
	private ticket: Ticket;
	private onBoardRefresh: () => Promise<void>;
	private el: HTMLElement | null = null;

	constructor(
		parentEl: HTMLElement,
		plugin: KanBullPlugin,
		projectId: string,
		colId: string,
		ticket: Ticket,
		onBoardRefresh: () => Promise<void>,
	) {
		this.parentEl = parentEl;
		this.plugin = plugin;
		this.projectId = projectId;
		this.colId = colId;
		this.ticket = ticket;
		this.onBoardRefresh = onBoardRefresh;
	}

	render(): void {
		this.el = this.parentEl.createDiv({ cls: "kan-bull-ticket-card" });
		this.el.setAttribute("draggable", "true");
		this.el.dataset.ticketId = this.ticket.id;

		// Title
		const titleEl = this.el.createDiv({ cls: "kan-bull-ticket-title" });
		titleEl.setText(this.ticket.title);
		if (this.ticket.title.length > 50) {
			this.el.setAttribute("aria-label", this.ticket.title);
		}

		// Description preview (first line only)
		if (this.ticket.description) {
			const firstLine = this.ticket.description.split("\n")[0];
			const descEl = this.el.createDiv({ cls: "kan-bull-ticket-desc" });
			descEl.setText(firstLine);
		}

		// Source indicator
		if (this.ticket.sourceNote) {
			const sourceEl = this.el.createDiv({ cls: "kan-bull-ticket-source" });
			sourceEl.setAttribute("aria-label", `From: ${this.ticket.sourceNote}`);
		}

		// Click to open detail modal
		this.el.addEventListener("click", (e) => {
			// Don't open modal if we're dragging
			if (this.el?.hasClass("kan-bull-dragging")) return;
			new TicketModal(
				this.plugin.app,
				this.plugin,
				this.projectId,
				this.colId,
				this.ticket,
				this.onBoardRefresh,
			).open();
		});

		// Right-click to delete
		this.el.addEventListener("contextmenu", async (e) => {
			e.preventDefault();
			const ok = await confirmDialog(
				this.plugin.app,
				`Delete ticket "${this.ticket.title}"?`,
			);
			if (!ok) return;
			await this.plugin.dataService.deleteTicket(this.projectId, this.colId, this.ticket.id);
			await this.onBoardRefresh();
		});

		// Drag events
		this.el.addEventListener("dragstart", (e) => {
			if (!e.dataTransfer || !this.el) return;
			e.dataTransfer.setData("text/plain", this.ticket.id);
			e.dataTransfer.setData("application/kan-bull-col", this.colId);
			e.dataTransfer.effectAllowed = "move";
			// Delay adding class so the drag image captures the card at normal opacity
			requestAnimationFrame(() => {
				this.el?.addClass("kan-bull-dragging");
			});
		});

		this.el.addEventListener("dragend", () => {
			this.el?.removeClass("kan-bull-dragging");
			// Clean up any lingering drop highlights
			document.querySelectorAll(".kan-bull-drop-active").forEach((el) => {
				el.removeClass("kan-bull-drop-active");
			});
		});
	}

	destroy(): void {
		this.el?.remove();
		this.el = null;
	}
}
