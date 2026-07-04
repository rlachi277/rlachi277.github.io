$("header").css("animation","6s ease title");
$("header").on("animationend", anim_end);

if (localStorage.getItem("kimclweb.lesspower")==="1") {
	$(":root").addClass("restricted");
}
localStorage.setItem("kimclweb.archive", null);

function togglePower() {
	if (localStorage.getItem("kimclweb.lesspower")==="1") {
		localStorage.setItem("kimclweb.lesspower","0");
		$(":root").removeClass("restricted");
	} else {
		localStorage.setItem("kimclweb.lesspower","1");
		$(":root").addClass("restricted");
	}
}

function anim_end() {
	$("header").css("animation","none");
	$(":root").addClass("on");
	$("#title1, #title2").attr("hidden","hidden");
	calc_fillers();
}

var clicks = 0;
function logo_click(e) {
	$(".logo, .bg").css("animation", "none");
	anim_end();
	$(".logo, .bg").offset();
	$(".logo, .bg").css("animation", "1s hue-rotate");
	clicks++;
	window.setTimeout(() => { if (clicks<6) clicks=0; }, 1000);
	if (clicks<6) return;
	$("#logo-img").attr("src","img/cycarchivelogo.png");
	$(".archivetile").attr("href", function() { return $(this).attr("data-archive"); });
	$("#about1").attr("href", ".");
	$("#about2").attr("href", "javascript:void(0)");
	$("#about2").on("click", () => (window.location.href="beyond/"));
	$(":root").addClass("archive");
	localStorage.setItem("kimclweb.archive", true);
}

$(window).on("resize", calc_fillers);

var cur_cols = -1;
function calc_fillers() {
	let cols = $("main.tiles").css("grid-template-columns").split(" ").length;
	if (cur_cols === cols) return;
	cur_cols = cols;
	let fillers = [0,0,0,0];
	switch (cols) {
		case 6:
			fillers = [1,1,1,1]; break;
		case 5:
			fillers = [3,1,1,0]; break;
		case 4:
			fillers = [3,0,0,0]; break;
	}
	$(`.tile.filler-tile`).slice(0,fillers[0]).css("display","block");
	$(`.tile.filler-tile`).slice(fillers[0]).css("display","none");
	$(`.tile.filler-wide`).slice(0,fillers[1]).css("display","block");
	$(`.tile.filler-wide`).slice(fillers[1]).css("display","none");
	$(`.tile.filler-tall`).slice(0,fillers[2]).css("display","block");
	$(`.tile.filler-tall`).slice(fillers[2]).css("display","none");
	$(`.tile.filler-big`).slice(0,fillers[3]).css("display","block");
	$(`.tile.filler-big`).slice(fillers[3]).css("display","none");
}