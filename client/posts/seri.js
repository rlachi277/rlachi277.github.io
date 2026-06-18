const SIMPLE_TYPES = new Set([
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
	if (el.nodeType === Node.TEXT_NODE) {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return el.textContent.replaceAll(/\n\s*/g, "");
	}
	if (el.nodeName.startsWith("#")) return undefined;
	if (el.classList.contains("new")) return undefined;

	const result = {
		type: null,
		variant: undefined,
		children: []
	};

	el.childNodes.forEach((e) => {
		const child = serialize(e);
		if (child != undefined) result.children?.push(child);
	});

	if (SIMPLE_TYPES.has(el.nodeName.toLowerCase())) {
		result.type = el.nodeName.toLowerCase();
		return result;
	}

	switch (init ? 'BODY' : el.nodeName) {
	case 'BODY':
		result.type = "body";
		break;
	case 'NAV':
		result.children = null;
		result.type = 'nav';
		break;
	case 'ARTICLE':
		result.type = "article";
		result.variant = {float: null};
		if (el.classList.contains('float-right')) result.variant.float = "right";
		else if (el.classList.contains('float-left')) result.variant.float = "left";
		break;
	case 'HR':
		result.variant = {rule: null};
		if (el.classList.contains('rule')) result.variant.rule = true;
	case 'BR':
		result.children = null;
		result.type = el.nodeName.toLowerCase();
		break;
	case 'P':
		result.type = "p";
		result.variant = getAttributes(el, ["lang"]);
		break;
	case 'FIGURE':
		result.type = "figure";
		result.variant = {float: null};
		if (el.classList.contains('float-right')) result.variant.float = "right";
		else if (el.classList.contains('float-left')) result.variant.float = "left";
		break;
	case 'IMG':
		result.type = "img";
		result.variant = {
			size: seriSize(el),
			...getAttributes(el, ["src", "alt"])
		};
		result.children = null;
		break;
	case 'OL':
		result.type = 'ol';
		result.variant = getAttributes(el, ["start"]);
		break;
	case 'AUDIO':
		result.type = "audio";
		result.variant = getAttributes(el, [
			"src", "controls", "crossorigin", "loop", "muted", "preload"
		]);
		break;
	case 'VIDEO':
		result.type = "video";
		result.variant = {
			size: seriSize(el),
			...getAttributes(el, [
				"src", "autoplay", "controls", "crossorigin", "loop",
				"muted", "poster", "preload"
			])
		};
		break;
	case 'TRACK':
		result.type = "track";
		result.variant = getAttributes(el, [
			"src", "srclang", "default", "kind", "label"
		]);
		break;
	case 'SOURCE':
		// currently <audio>, <video> only
		result.type = "source";
		result.variant = getAttributes(el, ["src", "media"]);
		break;
	case 'A':
		result.type = "a";
		result.variant = getAttributes(el, [
			"href", "target", "download", "rel"
		]);
		result.variant.shape = null;
		if (el.classList.contains("broken")) {
			result.variant.shape = "broken";
		} else if (el.classList.contains("color")) {
			result.variant.shape = "color";
			result.variant.color = getColor(el.classList);
		} else if (el.classList.contains("colorbox")) {
			result.variant.shape = "colorbox";
			result.variant.color = getColor(el.classList);
		}
		break;
	case 'BUTTON':
		result.type = "button";
		// todo: button attributes
		result.variant = {};
		if (el.classList.contains("colorbox")) {
			result.variant.shape = "colorbox";
			result.variant.color = getColor(el.classList);
		}
		break;
	default:
		if (el.classList.contains("columns")) {
			result.type = "columns";
		} else if (el.classList.contains("color")) {
			result.type = "color";
			result.variant = {color: getColor(el.classList), click: el.classList.contains("click")};
		} else if (el.classList.contains("colorbox")) {
			result.type = "colorbox";
			result.variant = {color: getColor(el.classList), click: el.classList.contains("click")};
		} else {
			return undefined;
		}
	}

	return result;
}

function seriSize(el) {
	if (el.classList.contains("full")) return "full";
	if (el.classList.contains("large")) return "large";
	if (el.classList.contains("small")) return "small";
	return "medium";
}

function getAttributes(el, names) {
	const variant = {};
	for (const e of names) {
		variant[e] = el.getAttribute(e)?.replaceAll("\n","") ?? null;
	}
	return variant;
}

export function deserialize(el, cur, init) {
	if (typeof el === 'string' || el instanceof String) return sani(el);

	let tagName = null;
	let attrs = "";
	let children = "";
	let isVoid = false;
	el.children?.forEach((e) => {
		const child = deserialize(e, cur);
		if (child != null) children += child;
	});
	
	if (init || el.type === 'body') return children;
	if (SIMPLE_TYPES.has(el.type)) return `<${el.type}>${children}</${el.type}>`;

	switch (el.type) {
	case 'nav': case 'br':
		isVoid = true;
		tagName = el.type;
		break;
	case 'hr':
		tagName = "hr";
		if (el.variant?.rule) attrs = ` class="rule"`;
		break;
	case 'article': case 'figure':
		tagName = el.type;
		switch (el.variant?.float) {
		case 'right': attrs = ` class="float-right"`; break;
		case 'left': attrs = ` class="float-left"`; break;
		}
		break;
	case 'p':
		tagName = "p";
		attrs += setAttributes(el, el.variant, ["lang"]);
		break;
	case 'img':
		tagName = "img";
		isVoid = true;
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el, el.variant, ["alt"]);
		attrs += deseriSize(el.variant?.size);
		break;
	case 'ol':
		tagName = "ol";
		if (el.variant?.start != null) attrs = ` start="${sani(el.variant?.start)}"`;
		break;
	case 'audio':
		tagName = "audio";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el, el.variant, [
			"controls", "crossorigin", "loop", "muted", "preload"
		]);
		break;
	case 'video':
		tagName = "video";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el, el.variant, [
			"autoplay", "controls", "crossorigin", "loop",
			"muted", "poster", "preload"
		]);
		attrs += deseriSize(el.variant?.size);
		break;
	case 'track':
		tagName = "track";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el, el.variant, [
			"srclang", "default", "kind", "label"
		]);
		break;
	case 'source':
		// currently <audio>, <video> only
		tagName = "source";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el, el.variant, ["media"]);
		break;
	case 'a':
		tagName = "a";
		attrs += setAttributes(el, el.variant, ["hraf", "target", "download", "rel"]);
		switch (el.variant?.shape) {
		case 'broken':
			attrs += ` class="broken"`;
			break;
		case 'color':
			attrs += ` class="color c${el.variant?.color}"`;
			break;
		case 'colorbox':
			attrs += ` class="colorbox c${el.variant?.color}"`;
			break;
		}
		break;
	case 'button':
		tagName = "button";
		// todo: button attributes
		switch (el.variant?.shape) {
		case 'color':
			attrs += ` class="color c${el.variant?.color}"`;
			break;
		case 'colorbox':
			attrs += ` class="colorbox c${el.variant?.color}"`;
			break;
		}
		break;
	case 'columns':
		tagName = "div";
		attrs = ` class="columns"`;
		break;
	case 'color':
		tagName = "span";
		attrs = ` class="color c${el.variant?.color}"${el.variant?.click?" click":""}`;
		break;
	case 'colorbox':
		tagName = "span";
		attrs = ` class="colorbox c${el.variant?.color}"${el.variant?.click?" click":""}`;
		break;
	default:
		return null;
	}

	if (isVoid) return `<${tagName}${attrs}>`;
	else return `<${tagName}${attrs}>${children}</${tagName}>`;
}

export function getColor(classList) {
	for (let i=0; i<=10; i++) {
		if (classList.contains(`c${i}`)) return i;
	}
	return -1;
}

function deseriSize(size) {
	switch (size) {
	case 'large': return ` class="loading large" onload="this.classList.remove('loading')`;
	case 'small': return ` class="loading small" onload="this.classList.remove('loading')`;
	case 'full': return ` class="loading full" onload="this.classList.remove('loading')`;
	default: return ` class="loading" onload="this.classList.remove('loading')`;
	}
}

function setAttributes(el, variant, names) {
	let result = '';
	for (const e of names) {
		if (variant?.[e] != null) result += ` ${e}="${sani(variant?.[e])}"`;
	}
	return result;
}

function sani(s) {
	// 막기 귀찮아요
	// 여러분 XSS는 하면 안 되는 겁니다
	return s
		.replaceAll(/&/g, "&amp;")
		.replaceAll(/"/g, "&quot;")
		.replaceAll(/</g, "&lt;")
		.replaceAll(/>/g, "&gt;");
}

function assets(src, cur) {
	// 임시방편(파일 업로드 시스템 등이 구현된다면 바뀔 예정)
	if (src.startsWith("/")) return src;
	const url = new URL(src, `file://${cur.replace(/^\/posts\//, "/assets/")}`);
	return url.pathname;
}
