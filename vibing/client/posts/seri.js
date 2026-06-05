const SIMPLE_SERIALIZED_TYPES = new Set([
	"H1", "H2", "H3", "H4", "H5", "H6", "HGROUP",
	"LEGEND", "FIELDSET",
	"LI", "UL", "DETAILS", "SUMMARY",
	"STRONG", "EM", "B", "I", "U",
	"RUBY", "RT", "RP",
	"SUB", "SUP", "INS", "DEL"
]);

const SIMPLE_DESERIALIZED_TYPES = new Set([
	"section", "hgroup",
	"fieldset", "ul", "details",
	"h1", "h2", "h3", "h4", "h5", "h6",
	"figcaption", "legend",
	"li", "summary",
	"strong", "em", "b", "i", "u",
	"ruby", "rt", "rp",
	"sub", "sup", "ins", "del"
]);

export function serialize(el, init) {
	if (el.nodeName === "#text") {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return el.textContent.replace(/\n\s*$/, "");
	}
	if (el.nodeName.startsWith("#")) return undefined;
	if (el.classList.contains("new")) return undefined;

	const result = {
		type: null,
		variant: undefined,
		children: []
	};

	if (!serializeElement(el, result, init)) return undefined;
	serializeChildren(el, result);
	return result;
}

function serializeElement(el, result, init) {
	const nodeName = init ? "BODY" : el.nodeName;

	if (SIMPLE_SERIALIZED_TYPES.has(nodeName)) {
		result.type = nodeName.toLowerCase();
		return true;
	}

	switch (nodeName) {
	case "BODY":
		result.type = "body";
		return true;
	case "NAV":
		result.children = null;
		result.type = "nav";
		return true;
	case "SECTION":
		result.type = "section";
		return true;
	case "ARTICLE":
		result.type = "article";
		result.variant = floatVariant(el);
		return true;
	case "HR":
		result.variant = {rule: null};
		if (el.classList.contains("rule")) result.variant.rule = true;
		result.children = null;
		result.type = "hr";
		return true;
	case "BR":
		result.children = null;
		result.type = "br";
		return true;
	case "P":
		result.type = "p";
		result.variant = {lang: null};
		if (el.getAttribute("lang") === "en") result.variant.lang = "en";
		return true;
	case "FIGURE":
		result.type = "figure";
		result.variant = floatVariant(el);
		return true;
	case "FIGCAPTION":
		result.type = "figcaption";
		return true;
	case "IMG":
		result.type = "img";
		result.variant = {
			src: withoutLineFeeds(el.getAttribute("src")),
			alt: withoutLineFeeds(el.getAttribute("alt")),
			size: mediaSize(el)
		};
		result.children = null;
		return true;
	case "OL":
		result.type = "ol";
		result.variant = {start: withoutLineFeeds(el.getAttribute("start"))};
		return true;
	case "AUDIO":
		result.type = "audio";
		result.variant = mediaVariant(el, [
			"src", "controls", "crossorigin", "loop", "muted", "preload"
		]);
		return true;
	case "VIDEO":
		result.type = "video";
		result.variant = {
			size: mediaSize(el),
			...mediaVariant(el, [
				"src", "autoplay", "controls", "crossorigin", "loop",
				"muted", "poster", "preload"
			])
		};
		return true;
	case "TRACK":
		result.type = "track";
		result.variant = mediaVariant(el, [
			"src", "srclang", "default", "kind", "label"
		]);
		return true;
	case "SOURCE":
		result.type = "source";
		result.variant = mediaVariant(el, ["src", "media"]);
		return true;
	case "A":
		result.type = "a";
		result.variant = {
			href: withoutLineFeeds(el.getAttribute("href")),
			target: withoutLineFeeds(el.getAttribute("target")),
			download: withoutLineFeeds(el.getAttribute("download")),
			rel: withoutLineFeeds(el.getAttribute("rel")),
			shape: null
		};
		addLinkShape(el, result.variant);
		return true;
	case "BUTTON":
		result.type = "button";
		result.variant = {};
		if (el.classList.contains("colorbox")) {
			result.variant.shape = "colorbox";
			result.variant.color = getColor(el.classList);
		}
		return true;
	default:
		return serializeClassOnlyElement(el, result);
	}
}

function serializeClassOnlyElement(el, result) {
	if (el.classList.contains("columns")) {
		result.type = "columns";
		return true;
	}
	if (el.classList.contains("color")) {
		result.type = "color";
		result.variant = colorVariant(el);
		return true;
	}
	if (el.classList.contains("colorbox")) {
		result.type = "colorbox";
		result.variant = colorVariant(el);
		return true;
	}
	return false;
}

function serializeChildren(el, result) {
	el.childNodes.forEach((child) => {
		const serialized = serialize(child);
		if (serialized != undefined) result.children?.push(serialized);
	});
}

function floatVariant(el) {
	const variant = {float: null};
	if (el.classList.contains("float-right")) variant.float = "right";
	else if (el.classList.contains("float-left")) variant.float = "left";
	return variant;
}

function mediaSize(el) {
	if (el.classList.contains("full")) return "full";
	if (el.classList.contains("large")) return "large";
	if (el.classList.contains("small")) return "small";
	return "medium";
}

function mediaVariant(el, names) {
	const variant = {};
	for (const name of names) variant[name] = withoutLineFeeds(el.getAttribute(name));
	return variant;
}

function colorVariant(el) {
	return {
		color: getColor(el.classList),
		click: el.classList.contains("click")
	};
}

function addLinkShape(el, variant) {
	if (el.classList.contains("broken")) {
		variant.shape = "broken";
	} else if (el.classList.contains("color")) {
		variant.shape = "color";
		variant.color = getColor(el.classList);
	} else if (el.classList.contains("colorbox")) {
		variant.shape = "colorbox";
		variant.color = getColor(el.classList);
	}
}

export function deserialize(data, cur, init) {
	if (typeof data === "string" || data instanceof String) return sanitize(data);
	if (init || data.type === "body") return deserializeChildren(data, cur);

	const rendered = renderElement(data, cur);
	if (rendered == null) return null;
	if (rendered.voidElement) return `<${rendered.tagName}${rendered.attrs}>`;
	return `<${rendered.tagName}${rendered.attrs}>${deserializeChildren(data, cur)}</${rendered.tagName}>`;
}

function renderElement(data, cur) {
	const attrs = [];
	let tagName = null;
	let voidElement = false;

	if (SIMPLE_DESERIALIZED_TYPES.has(data.type)) {
		tagName = data.type;
	} else {
		switch (data.type) {
		case "nav":
		case "br":
			tagName = data.type;
			voidElement = true;
			break;
		case "hr":
			tagName = "hr";
			if (data.variant?.rule) attrs.push(`class="rule"`);
			break;
		case "article":
		case "figure":
			tagName = data.type;
			addFloatClass(attrs, data.variant?.float);
			break;
		case "p":
			tagName = "p";
			addAttr(attrs, "lang", data.variant?.lang);
			break;
		case "img":
			tagName = "img";
			voidElement = true;
			addAssetAttr(attrs, "src", data.variant?.src, cur);
			addAttr(attrs, "alt", data.variant?.alt);
			addMediaClass(attrs, data.variant?.size);
			attrs.push(`onload="this.classList.remove('loading');"`);
			break;
		case "ol":
			tagName = "ol";
			addAttr(attrs, "start", data.variant?.start);
			break;
		case "audio":
			tagName = "audio";
			addAssetAttr(attrs, "src", data.variant?.src, cur);
			addAttr(attrs, "controls", data.variant?.controls);
			addAttr(attrs, "crossorigin", data.variant?.crossorigin);
			addAttr(attrs, "loop", data.variant?.loop);
			addAttr(attrs, "muted", data.variant?.muted);
			addAttr(attrs, "preload", data.variant?.preload);
			break;
		case "video":
			tagName = "video";
			addAssetAttr(attrs, "src", data.variant?.src, cur);
			addAttr(attrs, "autoplay", data.variant?.autoplay);
			addAttr(attrs, "controls", data.variant?.controls);
			addAttr(attrs, "crossorigin", data.variant?.crossorigin);
			addAttr(attrs, "loop", data.variant?.loop);
			addAttr(attrs, "muted", data.variant?.muted);
			addAssetAttr(attrs, "poster", data.variant?.poster, cur);
			addAttr(attrs, "preload", data.variant?.preload);
			addMediaClass(attrs, data.variant?.size);
			attrs.push(`onload="this.classList.remove('loading');"`);
			break;
		case "track":
			tagName = "track";
			addAssetAttr(attrs, "src", data.variant?.src, cur);
			addAttr(attrs, "srclang", data.variant?.srclang);
			addAttr(attrs, "default", data.variant?.default);
			addAttr(attrs, "kind", data.variant?.kind);
			addAttr(attrs, "label", data.variant?.label);
			break;
		case "source":
			tagName = "source";
			addAssetAttr(attrs, "src", data.variant?.src, cur);
			addAttr(attrs, "media", data.variant?.media);
			break;
		case "a":
			tagName = "a";
			addAttr(attrs, "href", data.variant?.href);
			addAttr(attrs, "target", data.variant?.target);
			addAttr(attrs, "download", data.variant?.download);
			addAttr(attrs, "rel", data.variant?.rel);
			addShapeClass(attrs, data.variant);
			break;
		case "button":
			tagName = "button";
			addShapeClass(attrs, data.variant);
			break;
		case "columns":
			tagName = "div";
			attrs.push(`class="columns"`);
			break;
		case "color":
			tagName = "span";
			attrs.push(`class="color${data.variant?.click ? " click" : ""} c${data.variant?.color}"`);
			break;
		case "colorbox":
			tagName = "span";
			attrs.push(`class="colorbox${data.variant?.click ? " click" : ""} c${data.variant?.color}"`);
			break;
		default:
			return null;
		}
	}

	return {
		tagName: tagName,
		voidElement: voidElement,
		attrs: attrsToString(attrs)
	};
}

function deserializeChildren(data, cur) {
	let html = "";
	data.children?.forEach((child) => {
		const rendered = deserialize(child, cur);
		if (rendered != null) html += rendered;
	});
	return html;
}

function addAttr(attrs, name, value) {
	if (value != null) attrs.push(`${name}="${sanitize(value)}"`);
}

function addAssetAttr(attrs, name, value, cur) {
	if (value != null) addAttr(attrs, name, assets(value, cur));
}

function addFloatClass(attrs, float) {
	if (float === "right") attrs.push(`class="float-right"`);
	else if (float === "left") attrs.push(`class="float-left"`);
}

function addMediaClass(attrs, size) {
	if (size === "large") attrs.push(`class="loading large"`);
	else if (size === "small") attrs.push(`class="loading small"`);
	else if (size === "full") attrs.push(`class="loading full"`);
	else attrs.push(`class="loading"`);
}

function addShapeClass(attrs, variant) {
	switch (variant?.shape) {
	case "broken":
		attrs.push(`class="broken"`);
		break;
	case "color":
		attrs.push(`class="color c${variant?.color}"`);
		break;
	case "colorbox":
		attrs.push(`class="colorbox c${variant?.color}"`);
		break;
	}
}

function attrsToString(attrs) {
	return attrs.length === 0 ? "" : ` ${attrs.join(" ")}`;
}

export function getColor(classList) {
	for (let i = 0; i <= 10; i++) {
		if (classList.contains(`c${i}`)) return i;
	}
}

function withoutLineFeeds(s) {
	return s?.replaceAll("\n", "") ?? null;
}

function sanitize(s) {
	return s
		.replaceAll(/&/g, "&amp;")
		.replaceAll(/"/g, "&quot;")
		.replaceAll(/</g, "&lt;")
		.replaceAll(/>/g, "&gt;");
}

function assets(src, cur) {
	if (src.startsWith("/")) return src;
	const url = new URL(src, `file://${cur.replace(/^\/posts\//, "/assets/")}`);
	return url.pathname;
}
