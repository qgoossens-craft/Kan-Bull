import { ItemView, WorkspaceLeaf } from "obsidian";
import type KanBullPlugin from "./main";
import { Board } from "./components/Board";

export const VIEW_TYPE = "kan-bull-view";

export class KanBullView extends ItemView {
	plugin: KanBullPlugin;
	private board: Board | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: KanBullPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Kan-Bull";
	}

	getIcon(): string {
		return "layout-dashboard";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("kan-bull-root");

		this.board = new Board(container, this.plugin);
		await this.board.render();
	}

	async onClose(): Promise<void> {
		this.board?.destroy();
		this.board = null;
	}

	async refresh(): Promise<void> {
		if (this.board) {
			await this.board.render();
		}
	}
}
