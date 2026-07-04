if (localStorage.getItem("kimclweb.lesspower")==="1") {
	//$("#wrapper").replaceWith($("#wrapper").contents());
	$(":root").addClass("restricted");
}

let ch = 0;
let csh = 0;
function set_height() {
	let h = document.querySelector("#wrapper").clientHeight;
	let sh = document.querySelector("#wrapper").scrollHeight;
	if ($(":root").hasClass("restricted")) {
		$("#wrapper").css("--h", `${sh}px`);
		return;
	}
	if (ch === h && csh === sh) return;
	ch = h; csh = sh;
	$("#bg1").css("height",`${h + sh/16}px`);
	$("#bg1").css("top",`${sh/2 - (h + sh/16)/2}px`);
	$("#bg2").css("height",`${h + sh/8}px`);
	$("#bg2").css("top",`${sh/2 - (h + sh/8)/2}px`);
}
set_height();
$(window).on("resize", set_height);