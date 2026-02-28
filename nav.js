let mobile = false;
let nav_details;
function on_resize(init) {
	if (init) {
		mobile = false;
		nav_details = document.querySelectorAll("nav details")
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

function fill_nav(nav, data) {
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
		a.textContent = a.href = link ? link : "./";
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