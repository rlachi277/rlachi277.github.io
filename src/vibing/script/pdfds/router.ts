import express from "express";
import path from "node:path";
import {fileURLToPath} from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientDir = path.join(rootDir, "pdfds");

const router = express.Router();
export default router;

router.get("/api/manifest", (_req, res) => {
	res.status(200).json({
		updatedAt: new Date().toISOString(),
		summary: "PDF-DS is mounted as a reference-style chapter guide with interactive controls and attribution.",
		chapters: [
			{id: "philosophy", title: "Physical-Digital Fusion", summary: "A reference-style opening page with motif, GitHub CTA, and chapter index."},
			{id: "architecture", title: "System Architecture", summary: "A single-layer CSS architecture built from tokens, components, and utilities."},
			{id: "installation", title: "Installation", summary: "The live stylesheet is preferred and the local backup is used only if the CDN fails."},
			{id: "spacing", title: "Spacing scale", summary: "A small interactive bar display for the PDF-DS spacing tokens."},
			{id: "typography", title: "Typography", summary: "A display, title, label, body, and mono type specimen."},
			{id: "theme", title: "Color", summary: "Light and dark buttons flip the same achromatic component hierarchy."},
			{id: "materials", title: "Materials", summary: "Flat, bevel, active, and navigation-like surfaces."},
			{id: "components", title: "Buttons & Morphing", summary: "Buttons, inputs, target sizing, panels, and code blocks in PDF-DS classes."},
			{id: "forms", title: "Forms", summary: "Input states, validation feedback, and form rhythm using PDF-DS primitives."},
			{id: "modals", title: "Modals", summary: "A focused decision surface for urgent or destructive actions."},
			{id: "navigation", title: "Navigation", summary: "Hierarchy cues for active rows, number blocks, and chapter movement."},
			{id: "layout", title: "Split screen", summary: "A 20 to 50 percent asymmetric split-screen control inspired by the reference."},
			{id: "mobile", title: "Mobile drawer", summary: "A bottom-sheet navigation pattern for narrow screens and touch targets."},
			{id: "qa", title: "QA rules", summary: "Design compliance notes for red hierarchy, grids, spacing, and attribution."}
		],
		tokens: [
			{token: "--space-025", role: "Micro offset", use: "Fine correction and hairline rhythm."},
			{token: "--space-050", role: "Minimal gap", use: "Small inline gaps and dense interface controls."},
			{token: "--space-100", role: "Base unit", use: "Button internals, badge rhythm, and compact rows."},
			{token: "--space-150", role: "Control padding", use: "Inputs, panel headers, and navigation spacing."},
			{token: "--space-200", role: "Module padding", use: "Cards, tables, and normal component groups."},
			{token: "--space-300", role: "Section rhythm", use: "Sidebar padding, stacked panels, and blueprint grid size."},
			{token: "--space-400", role: "Major rhythm", use: "Hero panels, motif blocks, and wide internal padding."},
			{token: "--space-600", role: "Display rhythm", use: "Chapter openings and large empty-space decisions."}
		],
		principles: [
			{
				title: "Use the system primitives",
				body: "Prefer PDF-DS classes and CSS variables before adding page-specific styling."
			},
			{
				title: "Keep red functional",
				body: "Reserve functional red for active navigation, primary commands, indicators, and destructive emphasis."
			},
			{
				title: "Preserve hardware tactility",
				body: "Panels, buttons, and controls should use bevel, border, and active states instead of decorative gradients."
			},
			{
				title: "Credit the origin",
				body: "The sidebar and footer link back to qpi-labels/PDF-DS so the source system remains visible."
			}
		],
		releases: [
			{item: "Reference-style shell", status: "LIVE", owner: "Client"},
			{item: "Light/Dark buttons", status: "LIVE", owner: "Client"},
			{item: "CDN fallback copy", status: "READY", owner: "Static"},
			{item: "GitHub attribution", status: "VISIBLE", owner: "Content"}
		]
	});
});

router.use(express.static(clientDir));
router.get("/", (_req, res) => {
	res.sendFile(path.join(clientDir, "index.html"));
});
router.get("/index.html", (_req, res) => {
	res.sendFile(path.join(clientDir, "index.html"));
});
