function serialize(el, init) {
	if (el.nodeName === "#text") {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return el.textContent.replace(/\n\s*$/, "");
	}
	if (el.nodeName.startsWith("#")) return undefined;
	let result = {
		type: null,
		variant: undefined,
		children: []
	};
	let type_unset = false;
	let all_done = false;
	if (init) {
		result.type = "body";
	} else {
		switch (el.nodeName) {
		case 'BODY':
			result.type = "body";
			break;
		case 'NAV':
			result.type = "nav";
			result.variant = {data: serialize_nav(el)};
			break;
		case 'SECTION':
			result.type = "section";
			break;
		case 'ARTICLE':
			result.type = "article";
			result.variant = {float: null};
			if (el.classList.contains('float-right')) result.variant.float = "right";
			else if (el.classList.contains('float-left')) result.variant.float = "left";
			break;
		case 'HR': case 'BR':
			all_done = true;
		case 'HGROUP': case 'H1': case 'H2': case 'H3':
		case 'H4': case 'H5': case 'H6':
			result.type = el.nodeName.toLowerCase();
			break;
		case 'P':
			result.type = "p";
			result.variant = {lang: null};
			if (el.getAttribute('lang') === "en") result.variant.lang = "en";
			break;
		case 'FIGURE':
			result.type = "figure";
			result.variant = {float: null};
			if (el.classList.contains('float-right')) result.variant.float = "right";
			else if (el.classList.contains('float-left')) result.variant.float = "left";
			break;
		case 'FIGCAPTION': result.type = "figcaption"; break;
		case 'IMG':
			result.type = "img";
			result.variant = {
				src: el.getAttribute('src'),
				alt: el.getAttribute('alt'),
				size: 'medium'
			};
			if (el.classList.contains('large')) result.variant.size = "large";
			else if (el.classList.contains('small')) result.variant.size = "small";
			if (el.classList.contains('full')) result.variant.size = "full";
			all_done = true;
			break;
		case 'FIELDSET': case 'LEGEND':
			result.type = el.nodeName.toLowerCase();
			break;
		case 'OL':
			result.variant = {start: el.getAttribute('start')};
		case 'UL': case 'LI': case 'DETAILS': case 'SUMMARY':
			result.type = el.nodeName.toLowerCase();
			break;
		case 'STRONG': case 'EM': case 'B': case 'I': case 'U':
		case 'RUBY': case 'RT': case 'RP':
		case 'SUB': case 'SUP': case 'INS': case 'DEL':
			result.type = el.nodeName.toLowerCase();
			break;
		case 'AUDIO':
			result.type = "audio";
			result.variant = {
				src: el.getAttribute('src'),
				controls: el.getAttribute('controls'),
				crossorigin: el.getAttribute('crossorigin'),
				loop: el.getAttribute('loop'),
				muted: el.getAttribute('muted'),
				preload: el.getAttribute('preload')
			}
			break;
		case 'VIDEO':
			result.type = "video";
			result.variant = {
				size: "medium",
				src: el.getAttribute('src'),
				autoplay: el.getAttribute('autoplay'),
				controls: el.getAttribute('controls'),
				crossorigin: el.getAttribute('crossorigin'),
				loop: el.getAttribute('loop'),
				muted: el.getAttribute('muted'),
				poster: el.getAttribute('poster'),
				preload: el.getAttribute('preload')
			}
			if (el.classList.contains('large')) result.variant.size = "large";
			else if (el.classList.contains('small')) result.variant.size = "small";
			if (el.classList.contains('full')) result.variant.size = "full";
			break;
		case 'TRACK':
			result.type = "track";
			result.variant = {
				src: el.getAttribute('src'),
				srclang: el.getAttribute('srclang'),
				default: el.getAttribute('default'),
				kind: el.getAttribute('kind'),
				label: el.getAttribute('label')
			}
			break;
		case 'SOURCE':
			// currently <audio>, <video> only
			result.type = "source";
			result.variant = {
				src: el.getAttribute('src'),
				media: el.getAttribute('media')
			}
			break;
		case 'A':
			result.type = "a";
			result.variant = {
				href: el.getAttribute('href'),
				target: el.getAttribute('target'),
				download: el.getAttribute('download'),
				rel: el.getAttribute('rel'),
				shape: null
			}
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
			type_unset = true;
		}
	}
	if (all_done) return result;
	if (type_unset) {
		if (el.classList.contains("columns")) {
			result.type = "columns";
		} else if (el.nodeName === "RUBY") {
			result.type = "ruby";
			result.variant = {complex: true};
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
	el.childNodes.forEach((e) => {
		let c = serialize(e);
		if (c == undefined) return;
		result.children.push(c);
	});
	return result;
}

let editing = null, edit_id = null;
let edit_data = null;
let edit_map = null;
let original_map = null;

let edit_cur = [];

function deserialize(el, data, edit) {
	let new_el = null;
	if (typeof data === 'string' || data instanceof String) {
		new_el = document.createTextNode(data);
		el.appendChild(new_el);
		return data;
	}
	let editable = true;
	switch (data.type) {
	case 'body':
		new_el = el;
		if (edit) {
			if (editing != null && editing !== el) stop_edit();
			editing = el; edit_id = 0;
			edit_map = new Map();
			original_map = new Map();
		}
		editable = false;
		break;
	case 'nav':
		new_el = document.createElement('nav');
		deserialize_nav(new_el, data.variant.data);
		editable = false;
		break;
	case 'section': case 'hr': case 'br': case 'hgroup':
	case 'fieldset': case 'ul': case 'details':
		editable = false;
	case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
	case 'figcaption': case 'legend':
	case 'li': case 'summary':
	case 'strong': case 'em': case 'b': case 'i': case 'u':
	case 'ruby': case 'rt': case 'rp':
	case 'sub': case 'sup': case 'ins': case 'del':
		new_el = document.createElement(data.type);
		break;
	case 'article': case 'figure':
		new_el = document.createElement(data.type);
		switch (data.variant.float) {
			case 'right': new_el.classList.add("float-right"); break;
			case 'left': new_el.classList.add("float-left"); break;
		}
		editable = false;
		break;
	case 'p':
		new_el = document.createElement("p");
		if (data.variant.lang != null) new_el.setAttribute("lang", data.variant.lang);
		break;
	case 'img':
		new_el = document.createElement("img");
		if (data.variant.src != null) new_el.setAttribute("src", data.variant.src);
		if (data.variant.alt != null) new_el.setAttribute("alt", data.variant.alt);
		switch (data.variant.size) {
			case 'large': new_el.classList.add("large"); break;
			case 'small': new_el.classList.add("small"); break;
			case 'full': new_el.classList.add("full"); break;
		}
		editable = false;
		break;
	case 'ol':
		new_el = document.createElement("ol");
		if (data.variant.start != null) new_el.setAttribute("start", data.variant.start);
		editable = false;
		break;
	case 'audio':
		new_el = document.createElement("audio");
		if (data.variant.src != null) new_el.setAttribute("src", data.variant.src);
		if (data.variant.controls != null) new_el.setAttribute("controls", data.variant.controls);
		if (data.variant.crossorigin != null) new_el.setAttribute("crossorigin", data.variant.crossorigin);
		if (data.variant.loop != null) new_el.setAttribute("loop", data.variant.loop);
		if (data.variant.muted != null) new_el.setAttribute("muted", data.variant.muted);
		if (data.variant.preload != null) new_el.setAttribute("preload", data.variant.preload);
		editable = false;
		break;
	case 'video':
		new_el = document.createElement("video");
		if (data.variant.src != null) new_el.setAttribute("src", data.variant.src);
		if (data.variant.autoplay != null) new_el.setAttribute("autoplay", data.variant.autoplay);
		if (data.variant.controls != null) new_el.setAttribute("controls", data.variant.controls);
		if (data.variant.crossorigin != null) new_el.setAttribute("crossorigin", data.variant.crossorigin);
		if (data.variant.loop != null) new_el.setAttribute("loop", data.variant.loop);
		if (data.variant.muted != null) new_el.setAttribute("muted", data.variant.muted);
		if (data.variant.poster != null) new_el.setAttribute("poster", data.variant.poster);
		if (data.variant.preload != null) new_el.setAttribute("preload", data.variant.preload);
		if (data.variant.autoplay != null) new_el.play().catch(() => {
			if (!new_el.paused) return;
			new_el.addEventListener("click", () => {
				new_el.play();
			}, {once: true});
			console.log("click event listener added to autoplay <video>")
		})
		switch (data.variant.size) {
			case 'large': new_el.classList.add("large"); break;
			case 'small': new_el.classList.add("small"); break;
			case 'full': new_el.classList.add("full"); break;
		}
		editable = false;
		break;
	case 'track':
		new_el = document.createElement("track");
		if (data.variant.src != null) new_el.setAttribute("src", data.variant.src);
		if (data.variant.srclang != null) new_el.setAttribute("srclang", data.variant.srclang);
		if (data.variant.default != null) new_el.setAttribute("default", data.variant.default);
		if (data.variant.kind != null) new_el.setAttribute("kind", data.variant.kind);
		if (data.variant.label != null) new_el.setAttribute("label", data.variant.label);
		editable = false;
		break;
	case 'source':
		// currently <audio>, <video> only
		new_el = document.createElement("source");
		if (data.variant.src != null) new_el.setAttribute("src", data.variant.src);
		if (data.variant.media != null) new_el.setAttribute("media", data.variant.media);
		editable = false;
		break;
	case 'a':
		new_el = document.createElement("a");
		if (data.variant.href != null) new_el.setAttribute("href", data.variant.href);
		if (data.variant.target != null) new_el.setAttribute("target", data.variant.target);
		if (data.variant.download != null) new_el.setAttribute("download", data.variant.download);
		if (data.variant.rel != null) new_el.setAttribute("rel", data.variant.rel);
		switch (data.variant.shape) {
			case 'broken':
				new_el.classList.add("broken");
				break;
			case 'color':
				new_el.classList.add("color");
				setColor(new_el.classList, data.variant.color);
				break;
			case 'colorbox':
				new_el.classList.add("colorbox");
				setColor(new_el.classList, data.variant.color);
				break;
		}
		break;
	case 'button':
		new_el = document.createElement("button");
		// todo: button attributes
		switch (data.variant.shape) {
			case 'color':
				new_el.classList.add("color");
				setColor(new_el.classList, data.variant.color);
				break;
			case 'colorbox':
				new_el.classList.add("colorbox");
				setColor(new_el.classList, data.variant.color);
				break;
		}
		break;
	case 'columns':
		new_el = document.createElement("div");
		new_el.classList.add("columns");
		editable = false;
		break;
	case 'color':
		new_el = document.createElement("span");
		new_el.classList.add("color");
		if (data.variant.click) new_el.classList.add("click");
		setColor(new_el.classList, data.variant.color);
		break;
	case 'colorbox':
		new_el = document.createElement("span");
		new_el.classList.add("colorbox");
		if (data.variant.click) new_el.classList.add("click");
		setColor(new_el.classList, data.variant.color);
		break;
	default:
		return null;
	}
	let edit_result = null, edit_curi = 0;
	if (edit) {
		edit_result = {
			type: data.type,
			variant: data.variant,
			children: []
		};
		if (editable && !el.classList.contains("editable")) {
			edit_map.set(edit_id, {pos: Array.from(edit_cur), el: new_el});
			new_el.setAttribute("data-id", edit_id);
			edit_result.id = edit_id++;
			new_el.classList.add("editable");
			new_el.setAttribute("contenteditable", "plaintext-only");
			new_el.addEventListener("keydown", on_editable_keydown);
			new_el.addEventListener("input", on_editable_input);
			new_el.addEventListener("blur", on_editable_blur);
		}
	}
	data.children.forEach((e) => {
		edit_cur.push(edit_curi);
		let d = deserialize(new_el, e, edit);
		if (edit && d != null) {
			edit_result.children.push(d);
			edit_curi++;
		}
		edit_cur.pop();
	});
	if (new_el === el) edit_data = edit_result;
	else el.appendChild(new_el);
	original_map.set(new_el, JSON.stringify(data));
	return edit_result;
}

function getColor(classList) {
	if (classList.contains("c0")) return 0;
	if (classList.contains("c1")) return 1;
	if (classList.contains("c2")) return 2;
	if (classList.contains("c3")) return 3;
	if (classList.contains("c4")) return 4;
	if (classList.contains("c5")) return 5;
	if (classList.contains("c6")) return 6;
	if (classList.contains("c7")) return 7;
	if (classList.contains("c8")) return 8;
	if (classList.contains("c9")) return 9;
	if (classList.contains("c10")) return 10;
}

function setColor(classList, c) {
	classList.add(`c${c}`);
}

function serialize_nav(nav) {
	let menu = nav.querySelector("menu");
	let result = [];

	function serialize_li(el) {
		let a = el.childNodes[0];
		if (el.querySelector("ul") == null) {
			if (a.childNodes.length < 2) {
				if (a.childNodes.length == 0) return "";
				if (a.childNodes[0].nodeType === Node.TEXT_NODE)
					return a.childNodes[0].textContent;
				return "";
			}
			return a.childNodes[1].textContent;
		}
		let result = {name: "", children: []};
		setname: {
			if (a.childNodes.length < 2) {
				if (a.childNodes.length == 0) break setname;
				if (a.childNodes[0].nodeType === Node.TEXT_NODE) {
					result.name = a.childNodes[0].textContent;
					break setname;
				}
				break setname;
			}
			if (a.childNodes[1].nodeType === Node.TEXT_NODE)
				result.name = a.childNodes[1].textContent;
		}
		for (let e of el.querySelector("ul").children) {
			result.children.push(serialize_li(e));
		}
		return result;
	}
	for (let e of menu.children) result.push(serialize_li(e));
	return result;
}

function deserialize_nav(nav, data) {
	let details = document.createElement("details");
	details.setAttribute("open", "");
	let summary = document.createElement("summary");
	summary.textContent = "NAV";
	details.appendChild(summary);
	let menu = document.createElement("menu");

	function make_li(base, data) {
		let result = document.createElement("li");
		let a = document.createElement("a");
		if (typeof data === 'string' || data instanceof String) {
			data = { name: data, children: [] };
		}
		let link = base + data.name;
		a.href = link ? link : "./";
		let base_span = document.createElement("span");
		base_span.classList.add("nav-base");
		base_span.textContent = link ? base : "./";
		if (!link || base) a.appendChild(base_span);
		a.append(data.name);
		let url = new URL(link ? link : "./", window.location.href).href;
		if (window.location.href === url) a.classList.add("self");
		else fetch(url,{method:'HEAD'}).then((res) => {
			if (!res.ok) a.classList.add("broken");
		});
		result.appendChild(a);
		if (data.children.length === 0) return result;
		let ul = document.createElement("ul");
		for (let e of data.children) ul.appendChild(make_li(link, e));
		result.appendChild(ul);
		return result;
	}
	for (let e of data) menu.append(make_li("", e));
	details.appendChild(menu);
	nav.appendChild(details);
	on_resize(true);
}

let mobile = false;
let nav_details;
function on_resize(init) {
	if (init) {
		mobile = false;
		nav_details = document.querySelectorAll("nav details");
	}
	if (window.matchMedia("(max-width: 480px)").matches) {
		if (!init || mobile) return;
		console.log("3");
		mobile = true;
		nav_details.forEach((e) => { e.removeAttribute("open"); });
	} else {
		if (!mobile) return;
		mobile = false;
		nav_details.forEach((e) => { e.setAttribute("open", ""); });
	}
}
on_resize(true);

window.addEventListener('resize', () => on_resize());

function stop_edit() {
	submit_changes();
	document.querySelectorAll(".editable").forEach((e) => {
		e.removeAttribute("data-id");
		e.removeAttribute("contenteditable");
		e.classList.remove("editable");
		e.removeEventListener("keydown", on_editable_keydown);
		e.removeEventListener("input", on_editable_input);
		e.removeEventListener("blur", on_editable_blur);
	});
	editing = edit_id = edit_data = edit_map = original_map = null;
}

function on_editable_keydown(e) {
	// e.preventDefault();
}

function on_editable_input(e) {
	e.target.classList.add("edited");
}

function on_editable_blur(e) {
	e.target.normalize();
	if (JSON.stringify(serialize(e.target)) === original_map.get(e.target))
		e.target.classList.remove("edited");
}

function submit_changes() {
	document.activeElement.blur();
	document.querySelectorAll(".edited").forEach((e) => {
		let pos = edit_map.get(parseInt(e.getAttribute("data-id"))).pos;
		let new_data = serialize(e);
		// TODO: actually send to server
		alert(`PUT / pos: ${pos} / new_data: ${JSON.stringify(new_data)}`);
		original_map.set(e, JSON.stringify(new_data));
		e.classList.remove("edited");
	});
}