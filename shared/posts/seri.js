const SIMPLE_TYPES = new Set([
	"section", "hgroup",
	"fieldset", "ul", "details",
	"h1", "h2", "h3", "h4", "h5", "h6",
	"figcaption", "legend",
	"li", "summary",
	"strong", "em", "b", "i", "u", "s",
	"ruby", "rt", "rp",
	"sub", "sup", "ins", "del"
]);

export function seri(data, init, hooks = []) {
	if (data.nodeType === Node.TEXT_NODE) {
		if (/^\n\s*$/.test(data.textContent)) return null;
		return data.textContent.replaceAll(/\n\s*/g, "");
	}
	if (data.nodeName.startsWith("#")) return null;
	if (data.classList.contains("new") && !init) return null;

	const children = [];
	data.childNodes.forEach((e) => {
		const child = seri(e, false, hooks);
		if (child !== null) children.push(child);
	});

	for (const e of hooks) {
		const hookResult = e(data, init);
		if (hookResult !== undefined) {
			if (hookResult?.children != null) hookResult.children = children;
			return hookResult;
		}
	}

	const result = {
		type: null,
		variant: undefined,
		children: children
	};

	if (SIMPLE_TYPES.has(data.nodeName.toLowerCase())) {
		result.type = data.nodeName.toLowerCase();
		return result;
	}

	switch (init ? 'BODY' : data.nodeName) {
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
		if (data.classList.contains('float-right')) result.variant.float = "right";
		else if (data.classList.contains('float-left')) result.variant.float = "left";
		break;
	case 'HR':
		result.variant = {rule: null};
		if (data.classList.contains('rule')) result.variant.rule = true;
	case 'BR':
		result.children = null;
		result.type = data.nodeName.toLowerCase();
		break;
	case 'P':
		result.type = "p";
		result.variant = getAttributes(data, ["lang"]);
		break;
	case 'FIGURE':
		result.type = "figure";
		result.variant = {float: null};
		if (data.classList.contains('float-right')) result.variant.float = "right";
		else if (data.classList.contains('float-left')) result.variant.float = "left";
		break;
	case 'IMG':
		result.type = "img";
		result.variant = {
			size: seriSize(data),
			...getAttributes(data, ["src", "alt"])
		};
		result.children = null;
		break;
	case 'OL':
		result.type = 'ol';
		result.variant = getAttributes(data, ["start"]);
		break;
	case 'AUDIO':
		result.type = "audio";
		result.variant = getAttributes(data, [
			"src", "controls", "crossorigin", "loop", "muted", "preload"
		]);
		break;
	case 'VIDEO':
		result.type = "video";
		result.variant = {
			size: seriSize(data),
			...getAttributes(data, [
				"src", "autoplay", "controls", "crossorigin", "loop",
				"muted", "poster", "preload"
			])
		};
		break;
	case 'TRACK':
		result.type = "track";
		result.variant = getAttributes(data, [
			"src", "srclang", "default", "kind", "label"
		]);
		break;
	case 'SOURCE':
		// currently <audio>, <video> only
		result.type = "source";
		result.variant = getAttributes(data, ["src", "media"]);
		break;
	case 'A':
		result.type = "a";
		result.variant = getAttributes(data, [
			"href", "target", "download", "rel"
		]);
		result.variant.shape = null;
		if (data.classList.contains("broken")) {
			result.variant.shape = "broken";
		} else if (data.classList.contains("color")) {
			result.variant.shape = "color";
			result.variant.color = getColor(data.classList);
		} else if (data.classList.contains("colorbox")) {
			result.variant.shape = "colorbox";
			result.variant.color = getColor(data.classList);
		}
		break;
	case 'BUTTON':
		result.type = "button";
		// todo: button attributes
		result.variant = {};
		if (data.classList.contains("colorbox")) {
			result.variant.shape = "colorbox";
			result.variant.color = getColor(data.classList);
		}
		break;
	default:
		if (data.classList.contains("columns")) {
			result.type = "columns";
		} else if (data.classList.contains("color")) {
			result.type = "color";
			result.variant = {color: getColor(data.classList), click: data.classList.contains("click")};
		} else if (data.classList.contains("colorbox")) {
			result.type = "colorbox";
			result.variant = {color: getColor(data.classList), click: data.classList.contains("click")};
		} else {
			return null;
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

export function getColor(classList) {
	for (let i=0; i<=10; i++) {
		if (classList.contains(`c${i}`)) return i;
	}
	return -1;
}

export function deseri(el, cur, init, hooks = []) {
	if (typeof el === 'string' || el instanceof String) return sani(el);

	let children = "";
	el.children?.forEach((e) => {
		const child = deseri(e, cur, false, hooks);
		if (child !== null) children += child;
	});

	for (const e of hooks) {
		const hookResult = e(el, cur, init);

		if (hookResult !== undefined) {
			if (hookResult === null) return null;
			switch (hookResult.type) {
			case 'html':
				return hookResult.html;
			case 'void':
				return `<${hookResult.tagName}>`;
			default:
				return `<${hookResult.tagName}${hookResult.attrs}>${children}</${hookResult.tagName}>`;
			}
		}
	}

	let tagName = null;
	let attrs = "";
	let isVoid = false;

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
		attrs += setAttributes(el.variant, ["lang"]);
		break;
	case 'img':
		tagName = "img";
		isVoid = true;
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el.variant, ["alt"]);
		attrs += deseriSize(el.variant?.size);
		break;
	case 'ol':
		tagName = "ol";
		if (el.variant?.start != null) attrs = ` start="${sani(el.variant?.start)}"`;
		break;
	case 'audio':
		tagName = "audio";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el.variant, [
			"controls", "crossorigin", "loop", "muted", "preload"
		]);
		break;
	case 'video':
		tagName = "video";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el.variant, [
			"autoplay", "controls", "crossorigin", "loop",
			"muted", "poster", "preload"
		]);
		attrs += deseriSize(el.variant?.size);
		break;
	case 'track':
		tagName = "track";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el.variant, [
			"srclang", "default", "kind", "label"
		]);
		break;
	case 'source':
		// currently <audio>, <video> only
		tagName = "source";
		if (el.variant?.src != null) attrs += ` src="${sani(assets(el.variant?.src, cur))}"`;
		attrs += setAttributes(el.variant, ["media"]);
		break;
	case 'a':
		tagName = "a";
		attrs += setAttributes(el.variant, ["href", "target", "download", "rel"]);
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
		attrs = ` class="color c${el.variant?.color}${el.variant?.click?" click":""}"`;
		break;
	case 'colorbox':
		tagName = "span";
		attrs = ` class="colorbox c${el.variant?.color}${el.variant?.click?" click":""}"`;
		break;
	default:
		return null;
	}

	if (isVoid) return `<${tagName}${attrs}>`;
	else return `<${tagName}${attrs}>${children}</${tagName}>`;
}

function deseriSize(size) {
	let sizeClass = '';
	switch (size) {
		case 'large': sizeClass = ' large'; break;
		case 'small': sizeClass = ' small'; break;
		case 'full': sizeClass = ' full'; break;
	}
	return ` class="loading${sizeClass}" onload="this.classList.remove('loading')"`;
}

function setAttributes(variant, names) {
	let result = '';
	for (const e of names) {
		if (variant?.[e] != null) result += ` ${e}="${sani(variant?.[e])}"`;
	}
	return result;
}

export function sani(s) {
	// 막기 귀찮아요
	// 여러분 XSS는 하면 안 되는 겁니다
	return s
		.replaceAll(/&/g, "&amp;")
		.replaceAll(/"/g, "&quot;")
		.replaceAll(/'/g, "&apos;")
		.replaceAll(/`/g, "&grave;")
		.replaceAll(/</g, "&lt;")
		.replaceAll(/>/g, "&gt;");
}

function assets(src, cur) {
	// 임시방편(파일 업로드 시스템 등이 구현된다면 바뀔 예정)
	if (src.startsWith("/")) return src;
	const url = new URL(src, `file://${cur.replace(/^\/posts\//, "/assets/")}`);
	return url.pathname;
}
