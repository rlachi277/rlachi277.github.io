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