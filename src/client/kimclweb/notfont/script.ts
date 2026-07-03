import { $, d$n } from "../../query.js";

type Data = {
	f: string,
	s?: boolean,
	jo?: boolean
};

var compressed = false;

let code: Record<string, Data>;

export function setup() {
	switch2();
	d$n("mode1").addEventListener("click", switch1);
	d$n("mode2").addEventListener("click", switch2);
	d$n("mode3").addEventListener("click", switch3);
	d$n("mode4").addEventListener("click", switch4);

	d$n("aleft").addEventListener("click", () => $('#result-container').css('text-align','left'));
	d$n("acenter").addEventListener("click", () => $('#result-container').css('text-align','center'));
	d$n("aright").addEventListener("click", () => $('#result-container').css('text-align','right'));

	$("#code").on("input", update);

	update_size_slider();
	$("#result-size").on("input", onSizeInput);
	$("#result-size").on("mousemove", onSizeInput);
	$("#result-width").on("input", onWidthInput);
	$("#result-width").on("mousemove", onWidthInput);
}

function switch1() {
	code = JSON.parse(`{ "r":[{"f":"ㄱ"}], "s":[{"f":"ㄴ"}], "e":[{"f":"mod1"},{"f":"ㄴ"}], "f":[{"f":"ㄹ"}], "a":[{"f":"ㅁ"}], "q":[{"f":"mod1"},{"f":"ㅁ"}], "t":[{"f":"ㅅ"}], "d":[{"f":"ㅇ"}], "w":[{"f":"mod1"},{"f":"ㅅ"}], "c":[{"f":"mod0"},{"f":"ㅅ"}], "z":[{"f":"mod1"},{"f":"ㄱ"}], "x":[{"f":"mod0"},{"f":"ㄴ"}], "v":[{"f":"mod0"},{"f":"ㅁ"}], "g":[{"f":"mod1"},{"f":"ㅇ"}], "R":[{"f":"mod2"},{"f":"ㄱ"}], "E":[{"f":"mod3"},{"f":"ㄴ"}], "Q":[{"f":"mod3"},{"f":"ㅁ"}], "T":[{"f":"mod2"},{"f":"ㅅ"}], "W":[{"f":"mod3"},{"f":"ㅅ"}], "k":[{"f":"ㅏ"}], "i":[{"f":"mod2"},{"f":"ㅏ"}], "j":[{"f":"ㅓ"}], "u":[{"f":"mod2"},{"f":"ㅓ"}], "h":[{"f":"ㅗ"}], "y":[{"f":"mod2"},{"f":"ㅗ"}], "n":[{"f":"ㅜ"}], "b":[{"f":"mod2"},{"f":"ㅜ"}], "m":[{"f":"ㅡ"}], "l":[{"f":"ㅣ"}], "o":[{"f":"ㅐ"}], "O":[{"f":"mod2"},{"f":"ㅐ"}], "p":[{"f":"ㅔ"}], "P":[{"f":"mod2"},{"f":"ㅔ"}], "H":[{"f":"ㅚ"}], "N":[{"f":"ㅟ"}], "M":[{"f":"ㅢ"}], "K":[{"f":"mod0"},{"f":"ㅏ"}], "Y":[{"f":"mod0"},{"f":"ㅐ"}], "J":[{"f":"mod0"},{"f":"ㅓ"}], "B":[{"f":"mod0"},{"f":"ㅔ"}], " ":[{"f":"sp","s":true}], ",":[{"f":"comma","s":true}], ".":[{"f":"period","s":true}], "?":[{"f":"que","s":true}], "!":[{"f":"exc","s":true}] }`);
	$("#result-container").removeClass("compressed");
	compressed = false;
	refresh();
}

function switch2() {
	code = JSON.parse(`{ "r":[{"f":"ㄱ"}], "s":[{"f":"ㄴ"}], "e":[{"f":"ㄷ"}], "f":[{"f":"ㄹ"}], "a":[{"f":"ㅁ"}], "q":[{"f":"ㅂ"}], "t":[{"f":"ㅅ"}], "d":[{"f":"ㅇ"}], "w":[{"f":"ㅈ"}], "c":[{"f":"ㅊ"}], "z":[{"f":"ㅋ"}], "x":[{"f":"ㅌ"}], "v":[{"f":"ㅍ"}], "g":[{"f":"ㅎ"}], "R":[{"f":"ㄲ"}], "E":[{"f":"ㄸ"}], "Q":[{"f":"ㅃ"}], "T":[{"f":"ㅆ"}], "W":[{"f":"ㅉ"}], "k":[{"f":"ㅏ"}], "i":[{"f":"mod2"},{"f":"ㅏ"}], "j":[{"f":"ㅓ"}], "u":[{"f":"mod2"},{"f":"ㅓ"}], "h":[{"f":"ㅗ"}], "y":[{"f":"mod2"},{"f":"ㅗ"}], "n":[{"f":"ㅜ"}], "b":[{"f":"mod2"},{"f":"ㅜ"}], "m":[{"f":"ㅡ"}], "l":[{"f":"ㅣ"}], "o":[{"f":"ㅐ"}], "O":[{"f":"mod2"},{"f":"ㅐ"}], "p":[{"f":"ㅔ"}], "P":[{"f":"mod2"},{"f":"ㅔ"}], "H":[{"f":"ㅚ"}], "N":[{"f":"ㅟ"}], "M":[{"f":"ㅢ"}], "K":[{"f":"mod0"},{"f":"ㅏ"}], "Y":[{"f":"mod0"},{"f":"ㅐ"}], "J":[{"f":"mod0"},{"f":"ㅓ"}], "B":[{"f":"mod0"},{"f":"ㅔ"}], " ":[{"f":"sp","s":true}], ",":[{"f":"comma","s":true}], ".":[{"f":"period","s":true}], "?":[{"f":"que","s":true}], "!":[{"f":"exc","s":true}] }`);
	$("#result-container").removeClass("compressed");
	compressed = false;
	refresh();
}

function switch3() {
	code = JSON.parse(`{ "r":[{"f":"ㄱ"}], "s":[{"f":"ㄴ"}], "e":[{"f":"ㄷ"}], "f":[{"f":"ㄹ"}], "a":[{"f":"ㅁ"}], "q":[{"f":"ㅂ"}], "t":[{"f":"ㅅ"}], "d":[{"f":"ㅇ"}], "w":[{"f":"ㅈ"}], "c":[{"f":"ㅊ2"}], "z":[{"f":"ㅋ"}], "x":[{"f":"ㅌ2"}], "v":[{"f":"ㅍ2"}], "g":[{"f":"ㅎ"}], "R":[{"f":"ㄲ2"}], "E":[{"f":"ㄸ2"}], "Q":[{"f":"ㅃ2"}], "T":[{"f":"ㅆ2"}], "W":[{"f":"ㅉ2"}], "k":[{"f":"ㅏ"}], "i":[{"f":"mod2"},{"f":"ㅏ"}], "j":[{"f":"ㅓ"}], "u":[{"f":"mod2"},{"f":"ㅓ"}], "h":[{"f":"ㅗ"}], "y":[{"f":"mod2"},{"f":"ㅗ"}], "n":[{"f":"ㅜ"}], "b":[{"f":"mod2"},{"f":"ㅜ"}], "m":[{"f":"ㅡ"}], "l":[{"f":"ㅣ"}], "o":[{"f":"ㅐ"}], "O":[{"f":"mod2"},{"f":"ㅐ"}], "p":[{"f":"ㅔ"}], "P":[{"f":"mod2"},{"f":"ㅔ"}], "H":[{"f":"ㅚ"}], "N":[{"f":"ㅟ"}], "M":[{"f":"ㅢ"}], "K":[{"f":"mod0"},{"f":"ㅏ"}], "Y":[{"f":"mod0"},{"f":"ㅐ"}], "J":[{"f":"mod0"},{"f":"ㅓ"}], "B":[{"f":"mod0"},{"f":"ㅔ"}], " ":[{"f":"sp","s":true}], ",":[{"f":"comma","s":true}], ".":[{"f":"period","s":true}], "?":[{"f":"que","s":true}], "!":[{"f":"exc","s":true}] }`);
	$("#result-container").removeClass("compressed");
	compressed = false;
	refresh();
}

function switch4() {
	code = JSON.parse(`{ "r":[{"f":"ㄱ"}], "s":[{"f":"ㄴ"}], "e":[{"f":"ㄷ"}], "f":[{"f":"ㄹ"}], "a":[{"f":"ㅁ"}], "q":[{"f":"ㅂ"}], "t":[{"f":"ㅅ"}], "d":[{"f":"ㅇ"}], "w":[{"f":"ㅈ"}], "c":[{"f":"ㅊ2"}], "z":[{"f":"ㅋ"}], "x":[{"f":"ㅌ2"}], "v":[{"f":"ㅍ2"}], "g":[{"f":"ㅎ"}], "R":[{"f":"ㄲ2"}], "E":[{"f":"ㄸ2"}], "Q":[{"f":"ㅃ2"}], "T":[{"f":"ㅆ2"}], "W":[{"f":"ㅉ2"}], "k":[{"f":"ㅏ"}], "i":[{"f":"mod2"},{"f":"ㅏ"}], "j":[{"f":"ㅓ"}], "u":[{"f":"mod2"},{"f":"ㅓ"}], "h":[{"f":"ㅗ"}], "y":[{"f":"mod2"},{"f":"ㅗ"}], "n":[{"f":"ㅜ"}], "b":[{"f":"mod2"},{"f":"ㅜ"}], "m":[{"f":"ㅡ"}], "l":[{"f":"ㅣ"}], "o":[{"f":"ㅐ"}], "O":[{"f":"mod2"},{"f":"ㅐ"}], "p":[{"f":"ㅔ"}], "P":[{"f":"mod2"},{"f":"ㅔ"}], "H":[{"f":"ㅚ"}], "N":[{"f":"ㅟ"}], "M":[{"f":"ㅢ"}], "K":[{"f":"mod0"},{"f":"ㅏ"}], "Y":[{"f":"mod0"},{"f":"ㅐ"}], "J":[{"f":"mod0"},{"f":"ㅓ"}], "B":[{"f":"mod0"},{"f":"ㅔ"}], " ":[{"f":"sp","s":true}], ",":[{"f":"comma","s":true}], ".":[{"f":"period","s":true}], "?":[{"f":"que","s":true}], "!":[{"f":"exc","s":true}] }`); // 3과 동일
	$("#result-container").addClass("compressed");
	compressed = true;
	refresh();
}

function refresh() {
	oldcode = [];
	update();
}

function onSizeInput() {
	const value = parseInt((d$n("result-size") as HTMLInputElement).value);
	const news = `calc(${value / 20} * var(--base-length))`;
	$(":root").css("--symbol-size", news);
	$("#result-size-label").text(`크기: x${value / 20}`);
}

function onWidthInput() {
	const value = parseInt((d$n("result-width") as HTMLInputElement).value);
	const neww = `calc(${value} * var(--base-length))`;
	$("#result-container").css("width", neww);
	$("#result-width-label").text(`너비: ${value}개`);
}

function update_size_slider() {
	$("#result-width").attr("max", Math.floor(document.body.clientWidth / d$n("symbol-size").clientWidth - 1).toString());
}

const chcode = ['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g'];
const jucode = ['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l'];
const jocode = ['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'];
const cscode = ['','r','R','rt','s','sw','sg','e','E','f','fr','fa','fq','ft','fx','fv','fg','a','q','Q','qt','t','T','d','w','W','c','z','x','v','g'];

function to_code(str: string) {
	let res1 = str.replaceAll(', ',',').replaceAll('. ','.').replaceAll('? ','?').replaceAll('! ','!').replaceAll('ml','M').replaceAll('hk','K').replaceAll('ho','Y').replaceAll('hl','H').replaceAll('nj','J').replaceAll('np','B').replaceAll('nl','N').replaceAll('\\','')
	let res2 = ''
	for (const ch of res1) {
		let c = ch.charCodeAt(0);
		if (0x1100 <= c && c <= 0x1112) { res2 += chcode[c - 0x1100]; continue; }
		if (0x1161 <= c && c <= 0x1175) { res2 += jucode[c - 0x1161]; continue; }
		if (0x11a8 <= c && c <= 0x11c2) {
			c -= 0x11a7
			if (compressed) {
				res2 += jocode[c].slice(0,-1)+"ㅈ"+jocode[c].slice(-1);
				continue;
			}
			res2 += jocode[c]
			continue
		}
		if (0x3131 <= c && c <= 0x314e) { res2 += cscode[c - 0x3130]; continue; }
		if (0x314f <= c && c <= 0x3163) { res2 += jucode[c - 0x314f]; continue; }
		if (0xac00 <= c && c <= 0xd7a3) {
			c -= 0xac00
			let chidx = Math.floor(c / 588)
			let juidx = Math.floor((c%588) / 28)
			let joidx = c%28
			res2 += chcode[chidx]
			res2 += jucode[juidx]
			if (joidx===0) continue;
			if (compressed) {
				res2 += jocode[joidx].slice(0,-1)+"ㅈ"+jocode[joidx].slice(-1);
				continue;
			}
			res2 += jocode[joidx]
			continue;
		}
		res2 += ch
	}
	let res3: Data[] = [];
	let joflag = false;
	for (const ch of res2) {
		if (ch === "ㅈ") {
			joflag = true;
			continue;
		}
		if (ch == '\n') {
			res3.push({'f':'\n'});
			continue;
		}
		if ('0'<=ch && ch<='9') {
			res3.push({'f':ch});
			continue;
		}
		if (code[ch] === undefined) {
			res3.push({'f':'!'});
			continue;
		}
		res3 = res3.concat(JSON.parse(JSON.stringify(code[ch])));
		if (joflag) {
			res3[res3.length - 1].jo = true;
		}
		joflag = false;
	}
	return res3;
}

let oldcode: Data[] = [];

function update() {
	let txt = to_code((d$n("code") as HTMLInputElement).value);
	let common = 0;
	for (let i=0; i<Math.min(oldcode.length, txt.length); i++) {
		if (JSON.stringify(oldcode[i]) != JSON.stringify(txt[i])) break;
		common++;
	}
	console.log(common+" + \""+JSON.stringify(txt.slice(common))+"\"");
	oldcode = txt;
	txt = txt.slice(common);
	$(`.result-img:nth-child(n+${common+1})`).remove();
	for (const ch of txt) {
		if (ch.f == '\n') {
			d$n("result-container").insertAdjacentHTML("beforeend", `<br class="result-img">`);
			continue;
		}
		let top = false;
		if (compressed) {
			top = !$("#result-container *").list.at(-1)?.classList.contains("top");
		}
		if (ch.s) {
			d$n("result-container").insertAdjacentHTML("beforeend", `<div class="result-img${compressed?" full":""}" style="--data:url(/assets/notfont/${ch.f}.svg); aspect-ratio: 0.5;">`);
		} else {
			d$n("result-container").insertAdjacentHTML("beforeend", `<div class="result-img${!ch.jo&&top?" top":""}${ch.jo&&top?" bottom":""}" style="--data:url(/assets/notfont/${ch.f}.svg);">`);
		}
	}
}