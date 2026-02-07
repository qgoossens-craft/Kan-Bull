/** A styled dropdown replacement for native <select> elements. */
export class CustomSelect {
	private parentEl: HTMLElement;
	private triggerEl: HTMLElement;
	private labelEl: HTMLElement;
	private currentValue: string;
	private options: { value: string; label: string }[];
	private onChange: ((value: string) => void) | null;

	constructor(
		parentEl: HTMLElement,
		options: { value: string; label: string }[],
		initialValue: string,
		onChange?: (value: string) => void,
	) {
		this.parentEl = parentEl;
		this.options = options;
		this.currentValue = initialValue;
		this.onChange = onChange ?? null;

		// Build trigger button
		this.triggerEl = this.parentEl.createDiv({ cls: "kan-bull-custom-select" });
		this.labelEl = this.triggerEl.createSpan({ cls: "kan-bull-custom-select-label" });
		this.triggerEl.createSpan({ cls: "kan-bull-custom-select-chevron", text: "▾" });

		this.updateLabel();

		this.triggerEl.addEventListener("click", (e) => {
			e.stopPropagation();
			this.openPanel();
		});
	}

	getValue(): string {
		return this.currentValue;
	}

	setOptions(options: { value: string; label: string }[], keepValue = false): void {
		this.options = options;
		if (!keepValue || !options.find((o) => o.value === this.currentValue)) {
			this.currentValue = options.length > 0 ? options[0].value : "";
		}
		this.updateLabel();
	}

	private updateLabel(): void {
		const selected = this.options.find((o) => o.value === this.currentValue);
		this.labelEl.setText(selected?.label ?? "Select...");
	}

	private openPanel(): void {
		// Close any existing panel
		document.querySelector(".kan-bull-select-panel")?.remove();

		const panel = document.body.createDiv({ cls: "kan-bull-select-panel" });

		const rect = this.triggerEl.getBoundingClientRect();
		panel.style.top = `${rect.bottom + 2}px`;
		panel.style.left = `${rect.left}px`;
		panel.style.width = `${rect.width}px`;

		for (const opt of this.options) {
			const item = panel.createDiv({ cls: "kan-bull-select-item" });
			if (opt.value === this.currentValue) item.addClass("is-selected");
			item.createSpan({
				cls: "kan-bull-select-check",
				text: opt.value === this.currentValue ? "✓" : "",
			});
			item.createSpan({ text: opt.label });
			item.addEventListener("click", () => {
				this.currentValue = opt.value;
				this.updateLabel();
				panel.remove();
				this.onChange?.(opt.value);
			});
		}

		// Close on click outside
		const closeHandler = (evt: MouseEvent) => {
			if (!panel.contains(evt.target as Node) && !this.triggerEl.contains(evt.target as Node)) {
				panel.remove();
				document.removeEventListener("click", closeHandler, true);
			}
		};
		setTimeout(() => document.addEventListener("click", closeHandler, true), 0);
	}
}
