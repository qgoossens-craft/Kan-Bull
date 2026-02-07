import { Plugin, WorkspaceLeaf } from "obsidian";
import { DataService } from "./services/DataService";
import { KanBullView, VIEW_TYPE } from "./view";
import { KanBullSettingTab } from "./settings";

export default class KanBullPlugin extends Plugin {
	dataService!: DataService;

	async onload(): Promise<void> {
		this.dataService = new DataService(this);
		await this.dataService.loadAll();

		this.registerView(VIEW_TYPE, (leaf) => new KanBullView(leaf, this));

		this.addCommand({
			id: "open-board",
			name: "Open board",
			callback: () => this.activateView(),
		});

		this.addRibbonIcon("layout-dashboard", "Kan-Bull", () => this.activateView());

		this.addSettingTab(new KanBullSettingTab(this.app, this));

		this.registerTodoContextMenu();

		console.log("Kan-Bull loaded");
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);
		console.log("Kan-Bull unloaded");
	}

	async onExternalSettingsChange(): Promise<void> {
		await this.dataService.loadAll();
		const view = this.getView();
		if (view) await view.refresh();
	}

	async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}

	getView(): KanBullView | null {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leaves.length === 0) return null;
		return leaves[0].view as KanBullView;
	}

	private registerTodoContextMenu(): void {
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const file = view.file;
				if (!file) return;

				const todoPath = this.dataService.getData().settings.todoFilePath;
				if (file.path !== todoPath) return;

				// Collect all checkbox lines from selection (or single cursor line)
				const sel = editor.listSelections()[0];
				const fromLine = Math.min(sel.anchor.line, sel.head.line);
				const toLine = Math.max(sel.anchor.line, sel.head.line);

				const tasks: { lineNumber: number; text: string }[] = [];
				for (let i = fromLine; i <= toLine; i++) {
					const lineText = editor.getLine(i);
					if (/^\s*- \[.\]/.test(lineText)) {
						tasks.push({ lineNumber: i, text: lineText });
					}
				}

				if (tasks.length === 0) return;

				menu.addItem((item) => {
					const label = tasks.length === 1
						? "Send to Kan-Bull"
						: `Send ${tasks.length} tasks to Kan-Bull`;
					item.setTitle(label)
						.setIcon("layout-dashboard")
						.onClick(async () => {
							const { SendToModal } = await import("./components/SendToModal");
							new SendToModal(this.app, this, editor, tasks).open();
						});
				});
			}),
		);
	}
}
