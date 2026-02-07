export interface Ticket {
	id: string;
	title: string;
	description: string;
	sourceNote: string | null;
}

export interface Column {
	id: string;
	name: string;
	tickets: Ticket[];
}

export interface Project {
	id: string;
	name: string;
	columns: Column[];
}

export interface KanBullSettings {
	defaultColumns: string[];
	todoFilePath: string;
	lastProjectId: string | null;
}

export interface KanBullData {
	projects: Project[];
	settings: KanBullSettings;
}

export const DEFAULT_SETTINGS: KanBullSettings = {
	defaultColumns: ["Backlog", "Ongoing", "Review", "Done"],
	todoFilePath: "Todo.md",
	lastProjectId: null,
};

export const DEFAULT_DATA: KanBullData = {
	projects: [],
	settings: { ...DEFAULT_SETTINGS },
};
