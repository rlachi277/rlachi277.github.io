if (href === null || !href.startsWith("./")) return;
		const url = new URL(href, window.location.href);
		url.searchParams.set("edit", "t");
		e.setAttribute("href", url.toString());