import assert from "node:assert/strict";
import test from "node:test";
import {deserialize} from "../../client/posts/seri.js";

test("deserialize keeps media attributes well formed", () => {
	const html = deserialize({
		type: "body",
		children: [
			{
				type: "img",
				variant: {src: "pic.png", alt: "A <pic>", size: "small"},
				children: null
			},
			{
				type: "video",
				variant: {
					src: "clip.mp4",
					autoplay: "",
					controls: "",
					size: "medium"
				},
				children: []
			}
		]
	}, "/posts/example.html", true);

	assert.match(html, /<img /);
	assert.match(html, /alt="A &lt;pic&gt;"/);
	assert.match(html, /src="\/assets\/pic\.png"/);
	assert.match(html, /class="loading small"/);
	assert.match(html, /onload="this\.classList\.remove\('loading'\)"/);
	assert.match(html, /<video /);
	assert.match(html, / class="loading"/);
	assert.equal((html.match(/ autoplay=/g) ?? []).length, 1);
	assert.doesNotMatch(html, /"clip\.mp4"class=/);
	assert.doesNotMatch(html, /onload="[^"]*$/);
});

test("deserialize preserves distinct media size classes", () => {
	const cases = [
		["large", /class="loading large"/],
		["small", /class="loading small"/],
		["full", /class="loading full"/],
		["medium", /class="loading"/]
	];

	for (const [size, expected] of cases) {
		const html = deserialize({
			type: "img",
			variant: {src: "pic.png", alt: null, size: size},
			children: null
		}, "/posts/example.html");

		assert.match(html, expected);
		if (size !== "full") assert.doesNotMatch(html, /class="loading full"/);
	}
});

test("deserialize keeps link href and shape classes", () => {
	const html = deserialize({
		type: "body",
		children: [
			{
				type: "a",
				variant: {href: "/posts/next.html", target: "_blank", download: null, rel: "noopener"},
				children: ["next"]
			},
			{
				type: "a",
				variant: {href: "/broken", shape: "broken"},
				children: ["broken"]
			}
		]
	}, "/posts/example.html", true);

	assert.match(html, /<a href="\/posts\/next\.html" target="_blank" rel="noopener">next<\/a>/);
	assert.match(html, /<a href="\/broken" class="broken">broken<\/a>/);
	assert.doesNotMatch(html, /hraf=/);
});

test("deserialize keeps click inside color classes", () => {
	const html = deserialize({
		type: "body",
		children: [
			{type: "color", variant: {color: 2, click: true}, children: ["hot"]},
			{type: "colorbox", variant: {color: 7, click: true}, children: ["box"]}
		]
	}, "/posts/example.html", true);

	assert.match(html, /<span class="color c2 click">hot<\/span>/);
	assert.match(html, /<span class="colorbox c7 click">box<\/span>/);
	assert.doesNotMatch(html, /\s click>/);
});

test("deserialize escapes text and attributes", () => {
	const html = deserialize({
		type: "p",
		variant: {lang: "en\" onclick=\"bad"},
		children: ["<hello & goodbye>"]
	}, "/posts/example.html");

	assert.equal(
		html,
		"<p lang=\"en&quot; onclick=&quot;bad\">&lt;hello &amp; goodbye&gt;</p>"
	);
});
