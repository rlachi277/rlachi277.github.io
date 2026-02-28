let test_data = [{
	name: "",
	children: [
		"seri.html", "colors.html", "nav.html", {
			name: "ecyce/",
			children: ["index.html", "ecyce.html", "secret.html"]
		}
	]
}, {
	name: "../",
	children: ["test/", "README.md", "rickroll.mp4"]
}];
fill_nav(document.getElementById("test-nav"), test_data);