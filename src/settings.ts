import { App, PluginSettingTab, Setting } from "obsidian";
import type KanBullPlugin from "./main";

export class KanBullSettingTab extends PluginSettingTab {
	plugin: KanBullPlugin;

	constructor(app: App, plugin: KanBullPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Todo file path")
			.setDesc("Path to the todo file for right-click integration")
			.addText((text) =>
				text
					.setPlaceholder("Todo.md")
					.setValue(this.plugin.dataService.getData().settings.todoFilePath)
					.onChange(async (value) => {
						this.plugin.dataService.getData().settings.todoFilePath = value;
						await this.plugin.dataService.saveAll();
					}),
			);

		new Setting(containerEl)
			.setName("Default columns")
			.setDesc("Comma-separated column names for new projects")
			.addText((text) =>
				text
					.setPlaceholder("Backlog, Ongoing, Review, Done")
					.setValue(
						this.plugin.dataService.getData().settings.defaultColumns.join(", "),
					)
					.onChange(async (value) => {
						this.plugin.dataService.getData().settings.defaultColumns =
							value.split(",").map((s) => s.trim()).filter(Boolean);
						await this.plugin.dataService.saveAll();
					}),
			);
	}
}
