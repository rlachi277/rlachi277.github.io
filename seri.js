function serialize(el) {
	if (el.nodeName === "#text") {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return el.textContent;
	}
	if (el.nodeName.startsWith("#")) return undefined;
	let result = {
		type: null,
		variant: undefined,
		children: []
	};
	let type_unset = false;
	let all_done = false;
	switch (el.nodeName) {
		case 'BODY':
			result.type = "body";
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
		case 'RUBY':
			if (el.childNodes.length !== 2) { type_unset = true; break; }
			let el1 = el.childNodes[0]; let el2 = el.childNodes[1];
			if (el2.nodeName === "#text") {
				el1 = el2; el2 = el.childNodes[0];
			}
			if (el1.nodeName !== "#text" || el2.nodeName !== "RT") {
				type_unset = true; break;
			}
			result.type = "ruby";
			result.variant = {complex: false, rt: el2.textContent};
			result.children = [el1.textContent];
			all_done = true;
			break;
		case 'OL':
			result.variant = {start: el.getAttribute('start')};
		case 'UL': case 'LI': case 'DETAILS': case 'SUMMARY':
			result.type = el.nodeName.toLowerCase();
			break;
		case 'STRONG': case 'EM': case 'B': case 'I': case 'U':
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

function deserialize(obj) {
	let new_el = null;
	if (typeof obj === 'string' || obj instanceof String) {
		new_el = document.createTextNode(obj);
		return new_el;
	}
	switch (obj.type) {
		case 'body':
			new_el = document.createElement('div');
			new_el.classList.add("deserialized");
			break;
		case 'section': case 'hr': case 'br':
		case 'hgroup': case 'h1': case 'h2': case 'h3':
		case 'h4': case 'h5': case 'h6':
		case 'figcaption': case 'fieldset': case 'legend':
		case 'ul': case 'li': case 'details': case 'summary':
		case 'strong': case 'em': case 'b': case 'i': case 'u':
		case 'sub': case 'sup': case 'ins': case 'del':
			new_el = document.createElement(obj.type);
			break;
		case 'article': case 'figure':
			new_el = document.createElement(obj.type);
			switch (obj.variant.float) {
				case 'right': new_el.classList.add("float-right"); break;
				case 'left': new_el.classList.add("float-left"); break;
			}
			break;
		case 'p':
			new_el = document.createElement("p");
			if (obj.variant.lang != null) new_el.setAttribute("lang", obj.variant.lang);
			break;
		case 'img':
			new_el = document.createElement("img");
			if (obj.variant.src != null) new_el.setAttribute("src", obj.variant.src);
			if (obj.variant.alt != null) new_el.setAttribute("alt", obj.variant.alt);
			switch (obj.variant.size) {
				case 'large': new_el.classList.add("large"); break;
				case 'small': new_el.classList.add("small"); break;
				case 'full': new_el.classList.add("full"); break;
			}
			break;
		case 'ruby':
			new_el = document.createElement("ruby");
			if (!obj.variant.complex) {
				new_el.textContent = obj.children[0];
				let new_rt = document.createElement("rt");
				new_rt.textContent = obj.variant.rt;
				new_el.appendChild(new_rt);
				return new_el;
			}
			break;
		case 'ol':
			new_el = document.createElement("ol");
			if (obj.variant.start != null) new_el.setAttribute("start", obj.variant.start);
			break;
		case 'audio':
			new_el = document.createElement("audio");
			if (obj.variant.src != null) new_el.setAttribute("src", obj.variant.src);
			if (obj.variant.controls != null) new_el.setAttribute("controls", obj.variant.controls);
			if (obj.variant.crossorigin != null) new_el.setAttribute("crossorigin", obj.variant.crossorigin);
			if (obj.variant.loop != null) new_el.setAttribute("loop", obj.variant.loop);
			if (obj.variant.muted != null) new_el.setAttribute("muted", obj.variant.muted);
			if (obj.variant.preload != null) new_el.setAttribute("preload", obj.variant.preload);
			break;
		case 'video':
			new_el = document.createElement("video");
			if (obj.variant.src != null) new_el.setAttribute("src", obj.variant.src);
			if (obj.variant.autoplay != null) new_el.setAttribute("autoplay", obj.variant.autoplay);
			if (obj.variant.controls != null) new_el.setAttribute("controls", obj.variant.controls);
			if (obj.variant.crossorigin != null) new_el.setAttribute("crossorigin", obj.variant.crossorigin);
			if (obj.variant.loop != null) new_el.setAttribute("loop", obj.variant.loop);
			if (obj.variant.muted != null) new_el.setAttribute("muted", obj.variant.muted);
			if (obj.variant.poster != null) new_el.setAttribute("poster", obj.variant.poster);
			if (obj.variant.preload != null) new_el.setAttribute("preload", obj.variant.preload);
			if (obj.variant.autoplay != null) new_el.play().catch(() => {
				if (!new_el.paused) return;
				new_el.addEventListener("click", () => {
					new_el.play();
				}, {once: true});
				console.log("click event listener added to autoplay <video>")
			})
			switch (obj.variant.size) {
				case 'large': new_el.classList.add("large"); break;
				case 'small': new_el.classList.add("small"); break;
				case 'full': new_el.classList.add("full"); break;
			}
			break;
		case 'track':
			new_el = document.createElement("track");
			if (obj.variant.src != null) new_el.setAttribute("src", obj.variant.src);
			if (obj.variant.srclang != null) new_el.setAttribute("srclang", obj.variant.srclang);
			if (obj.variant.default != null) new_el.setAttribute("default", obj.variant.default);
			if (obj.variant.kind != null) new_el.setAttribute("kind", obj.variant.kind);
			if (obj.variant.label != null) new_el.setAttribute("label", obj.variant.label);
			break;
		case 'source':
			// currently <audio>, <video> only
			new_el = document.createElement("source");
			if (obj.variant.src != null) new_el.setAttribute("src", obj.variant.src);
			if (obj.variant.media != null) new_el.setAttribute("media", obj.variant.media);
			break;
		case 'a':
			new_el = document.createElement("a");
			if (obj.variant.href != null) new_el.setAttribute("href", obj.variant.href);
			if (obj.variant.target != null) new_el.setAttribute("target", obj.variant.target);
			if (obj.variant.download != null) new_el.setAttribute("download", obj.variant.download);
			if (obj.variant.rel != null) new_el.setAttribute("rel", obj.variant.rel);
			switch (obj.variant.shape) {
				case 'broken':
					new_el.classList.add("broken");
					break;
				case 'color':
					new_el.classList.add("color");
					setColor(new_el.classList, obj.variant.color);
					break;
				case 'colorbox':
					new_el.classList.add("colorbox");
					setColor(new_el.classList, obj.variant.color);
					break;
			}
			break;
		case 'button':
			new_el = document.createElement("button");
			// todo: button attributes
			switch (obj.variant.shape) {
				case 'color':
					new_el.classList.add("color");
					setColor(new_el.classList, obj.variant.color);
					break;
				case 'colorbox':
					new_el.classList.add("colorbox");
					setColor(new_el.classList, obj.variant.color);
					break;
			}
			break;
		case 'columns':
			new_el = document.createElement("div");
			new_el.classList.add("columns");
			break;
		case 'color':
			new_el = document.createElement("span");
			new_el.classList.add("color");
			if (obj.variant.click) new_el.classList.add("click");
			setColor(new_el.classList, obj.variant.color);
			break;
		case 'colorbox':
			new_el = document.createElement("span");
			new_el.classList.add("colorbox");
			if (obj.variant.click) new_el.classList.add("click");
			setColor(new_el.classList, obj.variant.color);
			break;
		default:
			return undefined;
	}
	obj.children.forEach((e) => {
		let d = deserialize(e);
		if (d == undefined) return;
		new_el.appendChild(d);
	});
	return new_el;
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