type ChapterId = "philosophy" | "architecture" | "installation" | "spacing" | "typography" | "theme" | "materials" | "components" | "forms" | "modals" | "navigation" | "layout" | "mobile" | "qa";

type ManifestChapter = {
	id: ChapterId;
	title: string;
	summary: string;
};

type ManifestItem = {
	item: string;
	status: string;
	owner: string;
};

type TokenRow = {
	token: string;
	role: string;
	use: string;
};

type Manifest = {
	updatedAt: string;
	summary: string;
	chapters: ManifestChapter[];
	tokens: TokenRow[];
	principles: Array<{
		title: string;
		body: string;
	}>;
	releases: ManifestItem[];
};

type SpacingToken = {
	name: string;
	value: number;
};

const storageKey = "vibing.pdfds.theme";
const chapterIds: ChapterId[] = ["philosophy", "architecture", "installation", "spacing", "typography", "theme", "materials", "components", "forms", "modals", "navigation", "layout", "mobile", "qa"];
const spacingTokens: SpacingToken[] = [
	{name: "--space-025", value: 2},
	{name: "--space-050", value: 4},
	{name: "--space-100", value: 8},
	{name: "--space-150", value: 12},
	{name: "--space-200", value: 16},
	{name: "--space-300", value: 24},
	{name: "--space-400", value: 32},
	{name: "--space-600", value: 48}
];

const nav = getElement<HTMLElement>("site-nav");
const overlay = getElement<HTMLElement>("drawer-overlay");
const bottomMenuToggle = getElement<HTMLButtonElement>("bottom-menu-toggle");
const themeLabel = getElement<HTMLElement>("theme-label");
const heroThemeToggle = getElement<HTMLButtonElement>("hero-theme-toggle");
const heroThemeIcon = getElement<HTMLElement>("hero-theme-icon");
const heroThemeLabel = getElement<HTMLElement>("hero-theme-label");
const sourceLink = getElement<HTMLLinkElement>("pdf-ds-source");
const sourceDot = getElement<HTMLElement>("css-source-dot");
const sourceLabel = getElement<HTMLElement>("css-source-label");
const sourceCardTitle = getElement<HTMLElement>("source-card-title");
const sourceCardCopy = getElement<HTMLElement>("source-card-copy");
const manifestSummary = getElement<HTMLElement>("manifest-summary");
const releaseRows = getElement<HTMLTableSectionElement>("release-rows");
const principleList = getElement<HTMLElement>("principle-list");
const tokenRows = getElement<HTMLTableSectionElement>("token-rows");
const prevPage = getElement<HTMLButtonElement>("prev-page");
const nextPage = getElement<HTMLButtonElement>("next-page");
const chapterPosition = getElement<HTMLElement>("chapter-position");
const spacingSlider = getElement<HTMLInputElement>("spacing-slider");
const spacingReadout = getElement<HTMLElement>("spacing-readout");
const spacingBars = getElement<HTMLElement>("spacing-bars");
const splitSlider = getElement<HTMLInputElement>("split-slider");
const splitStage = getElement<HTMLElement>("split-stage");
const splitReadout = getElement<HTMLElement>("split-readout");
const demoDrawerButton = getElement<HTMLButtonElement>("demo-drawer-button");
const pageLinks = Array.from(document.querySelectorAll<HTMLElement>("[data-page-link]"));
const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-page]"));
const themeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]"));

overlay.addEventListener("click", () => setMenuOpen(false));
bottomMenuToggle.addEventListener("click", () => setMenuOpen(!nav.classList.contains("mobile-nav-open")));
demoDrawerButton.addEventListener("click", () => setMenuOpen(true));
heroThemeToggle.addEventListener("click", () => {
	const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
	applyTheme(next);
	localStorage.setItem(storageKey, next);
});

pageLinks.forEach((link) => {
	link.addEventListener("click", (event) => {
		const page = normalizeChapter(link.dataset.pageLink);
		if (!page) return;
		event.preventDefault();
		activateChapter(page, true);
		setMenuOpen(false);
	});
});

themeButtons.forEach((button) => {
	button.addEventListener("click", () => {
		const theme = button.dataset.themeChoice === "dark" ? "dark" : "light";
		applyTheme(theme);
		localStorage.setItem(storageKey, theme);
	});
});

prevPage.addEventListener("click", () => {
	const index = chapterIds.indexOf(currentChapter());
	activateChapter(chapterIds[Math.max(0, index - 1)], true);
});

nextPage.addEventListener("click", () => {
	const index = chapterIds.indexOf(currentChapter());
	activateChapter(chapterIds[Math.min(chapterIds.length - 1, index + 1)], true);
});

spacingSlider.addEventListener("input", renderSpacing);
splitSlider.addEventListener("input", renderSplit);

window.addEventListener("hashchange", () => {
	activateChapter(chapterFromHash(), false);
});

sourceLink.addEventListener("load", () => updateCssSource());
sourceLink.addEventListener("error", () => {
	updateCssSource("error");
});

applyTheme(localStorage.getItem(storageKey) === "dark" ? "dark" : "light");
activateChapter(chapterFromHash(), false);
renderSpacing();
renderSplit();
updateCssSource();
void loadManifest();

function getElement<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Missing element #${id}`);
	return element as T;
}

function setMenuOpen(open: boolean): void {
	nav.classList.toggle("mobile-nav-open", open);
	overlay.hidden = !open;
	bottomMenuToggle.textContent = open ? "CLOSE" : "CONTENTS";
}

function activateChapter(chapter: ChapterId, pushHash: boolean): void {
	pages.forEach((section) => {
		section.hidden = section.dataset.page !== chapter;
		section.classList.toggle("pdf-animate-fade-in", section.dataset.page === chapter);
	});

	pageLinks.forEach((link) => {
		link.classList.toggle("active", link.dataset.pageLink === chapter);
		const number = link.querySelector<HTMLElement>(".nav-number");
		if (number) number.classList.toggle("active", link.dataset.pageLink === chapter);
		const guidelineNumber = link.querySelector<HTMLElement>(".guideline-number");
		if (guidelineNumber) guidelineNumber.classList.toggle("active", link.dataset.pageLink === chapter);
	});

	if (pushHash) {
		history.pushState(null, "", `#${chapter}`);
	}

	updateChapterControls(chapter);
	document.querySelector(".pdf-main-view")?.scrollTo({top: 0, behavior: "smooth"});
}

function updateChapterControls(chapter: ChapterId): void {
	const index = chapterIds.indexOf(chapter);
	prevPage.disabled = index <= 0;
	nextPage.disabled = index >= chapterIds.length - 1;
	chapterPosition.textContent = `${pad(index + 1)} / ${pad(chapterIds.length)}`;
}

function currentChapter(): ChapterId {
	const active = pages.find((page) => !page.hidden);
	return normalizeChapter(active?.dataset.page) ?? "philosophy";
}

function chapterFromHash(): ChapterId {
	return normalizeChapter(window.location.hash.replace("#", "")) ?? "philosophy";
}

function normalizeChapter(value: string | undefined): ChapterId | null {
	if (!value) return null;
	return chapterIds.includes(value as ChapterId) ? value as ChapterId : null;
}

function applyTheme(theme: "light" | "dark"): void {
	if (theme === "dark") {
		document.documentElement.dataset.theme = "dark";
		themeLabel.textContent = "Dark";
		heroThemeIcon.textContent = "☀️";
		heroThemeLabel.textContent = "Light";
	} else {
		delete document.documentElement.dataset.theme;
		themeLabel.textContent = "Light";
		heroThemeIcon.textContent = "🌙";
		heroThemeLabel.textContent = "Dark";
	}

	themeButtons.forEach((button) => {
		button.classList.toggle("active", button.dataset.themeChoice === theme);
	});
}

function updateCssSource(forcedState?: "error"): void {
	if (forcedState === "error") {
		setSourceState("error", "CSS unavailable", "The external stylesheet failed and the backup has not loaded yet.");
		return;
	}

	if (sourceLink.dataset.fallback === "true") {
		setSourceState("backup", "Local backup", "The CDN stylesheet failed, so this page is using ./pdf-ds.backup.css.");
		return;
	}

	setSourceState("upstream", "Upstream first", "The jsDelivr PDF-DS stylesheet is active; the backup remains unused.");
}

function setSourceState(state: string, title: string, copy: string): void {
	sourceDot.dataset.state = state;
	sourceLabel.textContent = title;
	sourceCardTitle.textContent = title;
	sourceCardCopy.textContent = copy;
}

async function loadManifest(): Promise<void> {
	manifestSummary.textContent = "Refreshing the server-side manifest.";

	try {
		const response = await fetch("./api/manifest", {headers: {Accept: "application/json"}});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const manifest = await response.json() as Manifest;
		renderManifest(manifest);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		manifestSummary.textContent = `Manifest unavailable: ${message}`;
		releaseRows.innerHTML = `
			<tr>
				<td>Manifest endpoint</td>
				<td><span class="pdf-badge">DOWN</span></td>
				<td>Client</td>
			</tr>
		`;
	}
}

function renderManifest(manifest: Manifest): void {
	manifestSummary.textContent = `${manifest.summary} Updated ${formatDate(manifest.updatedAt)}.`;
	tokenRows.innerHTML = manifest.tokens.map((token) => `
		<tr>
			<td><code>${escapeHtml(token.token)}</code></td>
			<td>${escapeHtml(token.role)}</td>
			<td>${escapeHtml(token.use)}</td>
		</tr>
	`).join("");

	principleList.innerHTML = manifest.principles.map((principle) => `
		<article class="pdf-panel">
			<h3 class="pdf-text-label-16">${escapeHtml(principle.title)}</h3>
			<p class="pdf-text-copy-14 pdf-text-muted">${escapeHtml(principle.body)}</p>
		</article>
	`).join("");

	releaseRows.innerHTML = manifest.releases.map((release) => `
		<tr>
			<td>${escapeHtml(release.item)}</td>
			<td><span class="pdf-badge">${escapeHtml(release.status)}</span></td>
			<td>${escapeHtml(release.owner)}</td>
		</tr>
	`).join("");
}

function renderSpacing(): void {
	const selected = spacingTokens[Number(spacingSlider.value)] ?? spacingTokens[0];
	spacingReadout.textContent = `${selected.name} (${selected.value}px)`;
	spacingBars.innerHTML = spacingTokens.map((token) => `
		<div class="spacing-row${token.name === selected.name ? " active" : ""}">
			<span class="pdf-text-copy-13-mono">${token.name}</span>
			<i style="width: ${token.value * 4}px"></i>
			<span class="pdf-text-copy-13-mono pdf-text-muted">${token.value}px</span>
		</div>
	`).join("");
}

function renderSplit(): void {
	const value = Number(splitSlider.value);
	splitStage.style.setProperty("--split-size", `${value}%`);
	splitReadout.textContent = `${value}%`;
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	}).format(new Date(value));
}

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
