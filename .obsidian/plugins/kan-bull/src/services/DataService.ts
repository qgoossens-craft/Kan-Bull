import type KanBullPlugin from "../main";
import {
	KanBullData,
	DEFAULT_DATA,
	Project,
	Column,
	Ticket,
} from "../models/types";

export class DataService {
	private data: KanBullData = { ...DEFAULT_DATA };
	private plugin: KanBullPlugin;

	constructor(plugin: KanBullPlugin) {
		this.plugin = plugin;
	}

	async loadAll(): Promise<KanBullData> {
		const raw = await this.plugin.loadData();
		if (raw) {
			this.data = {
				projects: raw.projects ?? [],
				settings: { ...DEFAULT_DATA.settings, ...raw.settings },
			};
		} else {
			this.data = { ...DEFAULT_DATA, settings: { ...DEFAULT_DATA.settings } };
		}
		return this.data;
	}

	async saveAll(): Promise<void> {
		await this.plugin.saveData(this.data);
	}

	getData(): KanBullData {
		return this.data;
	}

	getProjects(): Project[] {
		return this.data.projects;
	}

	getProject(id: string): Project | undefined {
		return this.data.projects.find((p) => p.id === id);
	}

	async createProject(name: string): Promise<Project> {
		const project: Project = {
			id: crypto.randomUUID(),
			name,
			columns: this.data.settings.defaultColumns.map((colName) => ({
				id: crypto.randomUUID(),
				name: colName,
				tickets: [],
			})),
		};
		this.data.projects.push(project);
		await this.saveAll();
		return project;
	}

	async deleteProject(id: string): Promise<void> {
		this.data.projects = this.data.projects.filter((p) => p.id !== id);
		if (this.data.settings.lastProjectId === id) {
			this.data.settings.lastProjectId = this.data.projects[0]?.id ?? null;
		}
		await this.saveAll();
	}

	async renameProject(id: string, name: string): Promise<void> {
		const project = this.getProject(id);
		if (project) {
			project.name = name;
			await this.saveAll();
		}
	}

	getColumn(projectId: string, colId: string): Column | undefined {
		const project = this.getProject(projectId);
		return project?.columns.find((c) => c.id === colId);
	}

	async addColumn(projectId: string, name: string): Promise<Column | undefined> {
		const project = this.getProject(projectId);
		if (!project) return undefined;
		const column: Column = {
			id: crypto.randomUUID(),
			name,
			tickets: [],
		};
		project.columns.push(column);
		await this.saveAll();
		return column;
	}

	async deleteColumn(projectId: string, colId: string): Promise<void> {
		const project = this.getProject(projectId);
		if (!project) return;
		project.columns = project.columns.filter((c) => c.id !== colId);
		await this.saveAll();
	}

	async renameColumn(projectId: string, colId: string, name: string): Promise<void> {
		const col = this.getColumn(projectId, colId);
		if (col) {
			col.name = name;
			await this.saveAll();
		}
	}

	async reorderColumns(projectId: string, fromIndex: number, toIndex: number): Promise<void> {
		const project = this.getProject(projectId);
		if (!project) return;
		const [moved] = project.columns.splice(fromIndex, 1);
		project.columns.splice(toIndex, 0, moved);
		await this.saveAll();
	}

	async addTicket(
		projectId: string,
		colId: string,
		title: string,
		description = "",
		sourceNote: string | null = null,
	): Promise<Ticket | undefined> {
		const col = this.getColumn(projectId, colId);
		if (!col) return undefined;
		const ticket: Ticket = {
			id: crypto.randomUUID(),
			title,
			description,
			sourceNote,
		};
		col.tickets.push(ticket);
		await this.saveAll();
		return ticket;
	}

	async updateTicket(
		projectId: string,
		colId: string,
		ticketId: string,
		updates: Partial<Pick<Ticket, "title" | "description">>,
	): Promise<void> {
		const col = this.getColumn(projectId, colId);
		if (!col) return;
		const ticket = col.tickets.find((t) => t.id === ticketId);
		if (!ticket) return;
		if (updates.title !== undefined) ticket.title = updates.title;
		if (updates.description !== undefined) ticket.description = updates.description;
		await this.saveAll();
	}

	async deleteTicket(projectId: string, colId: string, ticketId: string): Promise<void> {
		const col = this.getColumn(projectId, colId);
		if (!col) return;
		col.tickets = col.tickets.filter((t) => t.id !== ticketId);
		await this.saveAll();
	}

	async moveTicket(
		projectId: string,
		ticketId: string,
		fromColId: string,
		toColId: string,
		position: number,
	): Promise<void> {
		const project = this.getProject(projectId);
		if (!project) return;

		const fromCol = project.columns.find((c) => c.id === fromColId);
		const toCol = project.columns.find((c) => c.id === toColId);
		if (!fromCol || !toCol) return;

		const ticketIndex = fromCol.tickets.findIndex((t) => t.id === ticketId);
		if (ticketIndex === -1) return;

		const [ticket] = fromCol.tickets.splice(ticketIndex, 1);
		toCol.tickets.splice(position, 0, ticket);
		await this.saveAll();
	}

	findTicketLocation(projectId: string, ticketId: string): { colId: string; index: number } | null {
		const project = this.getProject(projectId);
		if (!project) return null;
		for (const col of project.columns) {
			const idx = col.tickets.findIndex((t) => t.id === ticketId);
			if (idx !== -1) return { colId: col.id, index: idx };
		}
		return null;
	}

	async setLastProjectId(id: string | null): Promise<void> {
		this.data.settings.lastProjectId = id;
		await this.saveAll();
	}
}
