import { Menu, Notice } from "obsidian";
import type KanBullPlugin from "../main";
import type { Project } from "../models/types";
import { ColumnComponent } from "./Column";
import { confirmDialog } from "./ConfirmModal";
import { ProjectModal } from "./ProjectModal";

export class Board {
	private containerEl: HTMLElement;
	private plugin: KanBullPlugin;
	private currentProjectId: string | null = null;
	private columnComponents: ColumnComponent[] = [];

	constructor(containerEl: HTMLElement, plugin: KanBullPlugin) {
		this.containerEl = containerEl;
		this.plugin = plugin;
	}

	async render(): Promise<void> {
		this.destroy();
		this.containerEl.empty();

		const data = this.plugin.dataService.getData();
		const projects = data.projects;

		// Determine current project
		if (this.currentProjectId && this.plugin.dataService.getProject(this.currentProjectId)) {
			// keep current
		} else if (data.settings.lastProjectId && this.plugin.dataService.getProject(data.settings.lastProjectId)) {
			this.currentProjectId = data.settings.lastProjectId;
		} else if (projects.length > 0) {
			this.currentProjectId = projects[0].id;
		} else {
			this.currentProjectId = null;
		}

		if (this.currentProjectId) {
			await this.plugin.dataService.setLastProjectId(this.currentProjectId);
		}

		// Empty state
		if (projects.length === 0) {
			this.renderEmptyState();
			return;
		}

		this.renderHeader(projects);
		this.renderColumnArea();
	}

	private renderEmptyState(): void {
		const empty = this.containerEl.createDiv({ cls: "kan-bull-empty" });
		empty.createEl("h2", { text: "No projects yet" });
		empty.createEl("p", { text: "Create your first project to get started." });
		const btn = empty.createEl("button", {
			text: "Create Project",
			cls: "mod-cta",
		});
		btn.addEventListener("click", () => {
			new ProjectModal(this.plugin.app, async (name) => {
				const project = await this.plugin.dataService.createProject(name);
				this.currentProjectId = project.id;
				await this.render();
			}).open();
		});
	}

	private renderHeader(projects: Project[]): void {
		const header = this.containerEl.createDiv({ cls: "kan-bull-header" });

		// Single compact row: [logo] [title] [divider] [dropdown] [+ button]
		const row = header.createDiv({ cls: "kan-bull-header-row" });

		// Logo — compact brand mark
		const logoImg = row.createEl("img", { cls: "kan-bull-logo-img" });
		const pluginDir = this.plugin.manifest.dir;
		logoImg.src = this.plugin.app.vault.adapter.getResourcePath(`${pluginDir}/kan-bull5.png`);
		logoImg.alt = "Kan-Bull";

		// Title
		row.createSpan({ text: "Kan-Bull", cls: "kan-bull-logo-title" });

		// Visual separator
		row.createSpan({ cls: "kan-bull-header-divider" });

		// Project controls area (pushed right with flex spacer)
		const projectRow = row.createDiv({ cls: "kan-bull-project-row" });

		// Project selector — custom dropdown using Obsidian's Menu
		const currentProject = this.currentProjectId
			? this.plugin.dataService.getProject(this.currentProjectId)
			: null;

		const dropdownBtn = projectRow.createDiv({ cls: "kan-bull-project-dropdown" });
		const dropdownLabel = dropdownBtn.createSpan({
			cls: "kan-bull-project-dropdown-label",
			text: currentProject?.name ?? "Select project",
		});
		dropdownBtn.createSpan({ cls: "kan-bull-project-dropdown-chevron", text: "▾" });

		// Left-click: open custom dropdown panel
		dropdownBtn.addEventListener("click", (e) => {
			// Close any existing panel
			const existing = document.querySelector(".kan-bull-dropdown-panel");
			if (existing) {
				existing.remove();
				return;
			}

			const panel = document.body.createDiv({ cls: "kan-bull-dropdown-panel" });

			// Position below the button
			const rect = dropdownBtn.getBoundingClientRect();
			panel.style.top = `${rect.bottom + 2}px`;
			panel.style.left = `${rect.left}px`;
			panel.style.width = `${rect.width}px`;

			for (const p of projects) {
				const item = panel.createDiv({ cls: "kan-bull-dropdown-item" });
				if (p.id === this.currentProjectId) item.addClass("is-selected");
				item.createSpan({
					cls: "kan-bull-dropdown-check",
					text: p.id === this.currentProjectId ? "✓" : "",
				});
				item.createSpan({ text: p.name });
				item.addEventListener("click", async () => {
					panel.remove();
					this.currentProjectId = p.id;
					await this.plugin.dataService.setLastProjectId(p.id);
					await this.render();
				});
			}

			// Close on click outside
			const closeHandler = (evt: MouseEvent) => {
				if (!panel.contains(evt.target as Node) && !dropdownBtn.contains(evt.target as Node)) {
					panel.remove();
					document.removeEventListener("click", closeHandler, true);
				}
			};
			setTimeout(() => document.addEventListener("click", closeHandler, true), 0);
		});

		// Right-click: delete project
		dropdownBtn.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			if (!currentProject) return;
			const menu = new Menu();
			menu.addItem((item) => {
				item.setTitle("Delete project")
					.setIcon("trash")
					.onClick(async () => {
						const ok = await confirmDialog(
							this.plugin.app,
							`Delete project "${currentProject.name}" and all its tickets?`,
						);
						if (!ok) return;
						await this.plugin.dataService.deleteProject(currentProject.id);
						this.currentProjectId = null;
						await this.render();
					});
			});
			menu.showAtMouseEvent(e);
		});

		// New project button
		const addBtn = projectRow.createEl("button", {
			cls: "kan-bull-add-project clickable-icon",
			attr: { "aria-label": "New project" },
		});
		addBtn.createSpan({ text: "+" });
		addBtn.addEventListener("click", () => {
			new ProjectModal(this.plugin.app, async (name) => {
				const project = await this.plugin.dataService.createProject(name);
				this.currentProjectId = project.id;
				await this.render();
			}).open();
		});

	}

	private renderColumnArea(): void {
		if (!this.currentProjectId) return;
		const project = this.plugin.dataService.getProject(this.currentProjectId);
		if (!project) return;

		const columnsContainer = this.containerEl.createDiv({ cls: "kan-bull-columns" });

		this.columnComponents = project.columns.map(
			(col) =>
				new ColumnComponent(
					columnsContainer,
					this.plugin,
					this.currentProjectId!,
					col,
					() => this.render(),
				),
		);

		for (const comp of this.columnComponents) {
			comp.render();
		}
	}

	destroy(): void {
		for (const comp of this.columnComponents) {
			comp.destroy();
		}
		this.columnComponents = [];
	}
}
