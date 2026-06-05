import assert from "node:assert/strict";
import test from "node:test";
import {deserialize} from "../../client/posts/seri.js";

test("deserialize keeps image alt text and valid video attributes", () => {
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
	assert.match(html, /<video /);
	assert.match(html, / class="loading"/);
	assert.equal((html.match(/ autoplay=/g) ?? []).length, 1);
	assert.doesNotMatch(html, /"clip\.mp4"class=/);
});
