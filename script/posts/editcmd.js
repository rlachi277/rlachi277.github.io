// sorry safari but I don't think I can support you
import { fetchget } from '../../global/util.js';
import { d$, get_kind, format_date, k2e } from './util.js';
import { dialog } from './dialog.js';
import { cancel_new, apply_new } from './editui.js';

function move_cursor_to(e, o) {
	if (e instanceof $) e = e.get(0);
	let p = e.parentNode;
	s.setPosition(p,Array.prototype.indexOf.call(p.childNodes,e)+o);
}

function put(el, arr, els) {
	for (let i in arr) {
		el.append(arr[i]);
		if (els[i]) el.append(els[i].cloneNode(true));
	}
}

function error() {
	$("#new").css("animation", "none");
	$("#new").offset();
	$("#new").css("animation", "error-flash 0.5s ease-out");
}

// edit

const s = window.getSelection();
function input(e) {
	/*console.log(e.originalEvent.key);
	console.log(s.anchorNode);
	console.log(s.anchorOffset);
	console.log(s.focusOffset);*/
	if (e.originalEvent.key === "Escape") {
		if (cancel_new()) e.preventDefault();
	}
	if (e.originalEvent.key === "Enter") {
		if (confirm("문단을 추가하시겠습니까?")) {
			apply_new();
			e.preventDefault();
		}
	}
	if (e.originalEvent.key === "Backspace" && $(".edit-inside").get(0) && $(".edit-inside").get(0).innerHTML.length === 0) {
		$(".edit-inside").off("blur");
		$(".edit-inside").get(0).blur();
		$("#new").html($("#new").html().replace("&nbsp;"," "));
		s.removeAllRanges();
		$("#new").attr("contenteditable", "plaintext-only");
		move_cursor_to($(".edit-inside"),1);
		$(".edit-inside").remove();
		e.preventDefault();
		return;
	}
	if (e.originalEvent.key === "Backspace" && $(".cafter").length) {
		let last = $(".cafter").get(0).lastChild;
		$(".cafter").replaceWith($(".cafter").contents());
		move_cursor_to(last,1);
		e.preventDefault();
		return;
	}
eend:if (e.originalEvent.key === "ArrowRight") {
		if (!e.originalEvent.target.classList.contains("editable")) break eend;
		if (e.originalEvent.key === "ArrowRight") {
			let n = s.anchorNode;
			if (n.nodeType === Node.TEXT_NODE) {
				if (n !== n.parentElement.lastChild || s.anchorOffset !== n.textContent.length) break eend;
			} else {
				if (s.anchorOffset !== n.childNodes.length) break eend;
			}
		}
		if (e.originalEvent.isComposing) return;
		cancel_edit_inside(true,true);
		e.preventDefault();
		return;
	}
estt:if (e.originalEvent.key === "ArrowLeft") {
		if (!e.originalEvent.target.classList.contains("editable")) break estt;
		if (e.originalEvent.key === "ArrowLeft") {
			let n = s.anchorNode;
			if (n.nodeType === Node.TEXT_NODE) {
				if (n !== n.parentElement.firstChild || s.anchorOffset !== 0) break estt;
			} else {
				if (s.anchorOffset !== 0) break estt;
			}
		}
		if (e.originalEvent.isComposing) return;
		cancel_edit_inside(true,false);
		e.preventDefault();
		return;
	}
editr:if (e.originalEvent.key === "ArrowRight") {
		if (s.anchorNode.nodeType === Node.TEXT_NODE && s.anchorOffset !== s.anchorNode.textContent.length) break editr;
		let n = s.anchorNode;
		if (n.nodeType === Node.TEXT_NODE) {
			if (s.anchorOffset !== n.textContent.length) break editr;
			n = n.nextSibling;
		} else {
			if (s.anchorOffset === n.childNodes.length) break editr;
			n = n.childNodes[s.anchorOffset];
		}
		if (!n) break editr;
		if (!n.classList?.contains("editable")) break editr;
		edit_inside(n);
		s.selectAllChildren(n);
		s.collapseToStart();
		e.preventDefault();
		return;
	}
editl:if (e.originalEvent.key === "ArrowLeft") {
		if (s.anchorNode.nodeType === Node.TEXT_NODE && s.anchorOffset !== 0) break editl;
		let n = s.anchorNode;
		if (n.nodeType === Node.TEXT_NODE) {
			if (s.anchorOffset !== 0) break editl;
			n = n.previousSibling;
		} else {
			if (s.anchorOffset === 0) break editl;
			n = n.childNodes[s.anchorOffset-1];
		}
		if (!n) break editl;
		if (!n.classList?.contains("editable")) break editl;
		edit_inside(n);
		s.selectAllChildren(n);
		s.collapseToEnd();
		e.preventDefault();
		return;
	}
cmd:if (e.originalEvent.key === "Tab") {
		if (e.originalEvent.isComposing) return;
		d$("new").normalize();
		e.preventDefault();
		if (!s.isCollapsed) {
			// TODO: 선택 어쩌고 구현
			s.collapseToEnd();
			return;
		}
		let n = s.anchorNode;
		let bef = null, aft = null;
		let cmd1 = null, cmd2 = null;
		let remove = [];
		let type = -1, ins = null;
		try {
			let t = "";
			let els = [];
			let put_as = undefined;
gett:		{
				if (n.nodeType === Node.TEXT_NODE) {
					t = n.textContent.slice(0,s.anchorOffset);
					aft = n.textContent.slice(s.anchorOffset);
					if (t.includes("{")) break gett;
					remove.push(n);
					n = n.previousSibling;
				} else {
					if (s.anchorOffset === 0) throw -1;
					n = n.childNodes[s.anchorOffset - 1];
				}
				while (n) {
					if (n.nodeType === Node.TEXT_NODE) {
						t = n.textContent + t;
						if (n.textContent.includes("{")) break;
					} else {
						t = "\uFFFC" + t;
						els.unshift(n);
					}
					remove.push(n);
					n = n.previousSibling;
				}
				if (!t.includes("{")) throw -1;
			}
			bef = t.slice(0,t.length - t.match(/\{[^\{]*$/).at(0).length);
			t = t.match(/\{[^\{]*$/).at(0);
			if (!t) throw -1;

			cmd1 = k2e(t.split("/")[0]).toLowerCase().trim();
			if (cmd1.includes("\uFFFC")) throw -1;
			cmd2 = t.split("/").slice(1);
			if (cmd2.at(-1)==="") cmd2 = cmd2.slice(0,-1);
			cmd2 = cmd2.map((e)=>e.split("\uFFFC"));
			console.log(`cmd: ${cmd1} / [${cmd2}]`);

			if (/\{-+/.test(cmd1)) [type, ins, put_as] = cmd_html(bef, aft, cmd2, `<hr>`);
			else if (cmd1 === "{todrkremf") [type, ins, put_as] = cmd_html(bef, aft, cmd2, `<h3>생각들</h3>`);
			else if (cmd1 === "{wjdqh") [type, ins, put_as] = cmd_html(bef, aft, cmd2, `<h3>정보</h3>`);
			else if (cmd1 === "{fig") [type, ins, put_as] = cmd_fig(bef, aft, cmd2, els);
			else if (cmd1.startsWith("{#")) [type, ins, put_as] = cmd_entry(cmd1, cmd2);
			else if (cmd1.startsWith("{r#")) [type, ins, put_as] = cmd_ref(cmd1, cmd2);
			else if (cmd1.startsWith("{a#")) [type, ins, put_as] = cmd_add(cmd1, cmd2)
			else if (cmd1.startsWith("{t")) [type, ins, put_as] = cmd_time(cmd1, cmd2);
			else if (cmd1.startsWith("{p") || cmd1.startsWith("{@")) [type, ins, put_as] = cmd_person(cmd1, cmd2);
			else if (cmd1 === "{?") [type, ins, put_as] = cmd_qm(cmd2);
			else if (cmd1 === "{st") [type, ins, put_as] = cmd_format(cmd2, `<b class="star">`);
			else if (cmd1 === "{s") [type, ins, put_as] = cmd_format(cmd2, `<s>`);
			else if (cmd1 === "{b" || cmd1 === "{str") [type, ins, put_as] = cmd_format(cmd2, `<strong>`);
			else if (cmd1 === "{u" || cmd1 === "{em") [type, ins, put_as] = cmd_format(cmd2, `<em>`);
			else if (cmd1 === "{q") [type, ins, put_as] = cmd_format(cmd2, `<q>`);
			else if (cmd1 === "{q\"") [type, ins, put_as] = cmd_format(cmd2, `<q class="exact">`);
			else if (cmd1 === "{qst") [type, ins, put_as] = cmd_format(cmd2, `<q class="star">`);
			else if (cmd1 === "{^" || cmd1 === "{sup") [type, ins, put_as] = cmd_format(cmd2, `<sup>`);
			else if (cmd1 === "{_" || cmd1 === "{sub") [type, ins, put_as] = cmd_format(cmd2, `<sub>`);
			else if (cmd1 === "{ins") [type, ins, put_as] = cmd_format(cmd2, `<ins>`);
			else if (cmd1 === "{del") [type, ins, put_as] = cmd_format(cmd2, `<del>`);
			else if (cmd1 === "{") [type, ins, put_as] = cmd_wrapper(cmd2);
			else if (cmd1 === "{.." || cmd1 === "{namu") [type, ins, put_as] = cmd_namu(cmd2);
			else if (cmd1.startsWith("{ec")) [type, ins, put_as] = cmd_placeholder(cmd1, cmd2); // ㄷㅊ(대체라는 뜻)
			else if (cmd1 === "{end") [type, ins, put_as] = cmd_end(cmd2);
			else if (cmd1 === "{.") [type, ins, put_as] = cmd_middot(cmd2);
			else throw "없는 명령";
			if (type === -1 || ins == null) throw "알 수 없는 오류 발생";
			if (put_as != undefined) put(ins, put_as, els);
		} catch (e) {
			console.log(e);
			error();
			break cmd;
		}
		n.textContent = bef;
		if (type === 8) {
			ins = document.createTextNode(ins)
			n.parentNode.insertBefore(ins, n.nextSibling); // n.nextSibling == null => 알아서 맨 마지막에 넣어줌
			if (aft) {
				let after = document.createTextNode(aft);
				ins.parentNode.insertBefore(after, ins.nextSibling);
				s.setPosition(after,0);
			} else {
				move_cursor_to(ins,1);
			}
			d$("new").normalize();
			cursor();
			return;
		}
		ins.attr("contenteditable", false);
		if (type & 1) ins.on("click", dialog);
		if (type & 2) ins.addClass("editable");
		$(n).after(ins);
		if (aft) {
			let after = document.createTextNode(aft);
			ins.after(after);
			if ((type & 4) && !cmd2.length) edit_inside(ins.get(0));
			else s.setPosition(after,0);
		} else {
			if ((type & 4) && !cmd2.length) edit_inside(ins.get(0));
			else move_cursor_to(ins,1);
		}
		for (let e of remove) e.remove();
		d$("new").normalize();
		cursor();
		return;
	}
}

function cursor() {
	/*console.log(s.anchorNode);
	console.log(s.anchorOffset);
	console.log(s.focusOffset);*/
	$(".cbefore").removeClass("cbefore");
	$(".cafter").removeClass("cafter");
	if (!d$("new") || d$("new").classList.contains("newhtml")) return;
	if (!s.anchorNode || !d$("new").contains(s.anchorNode)) return;
sel:{ // firefox
		let n = s.anchorNode;
		let right = 1;
		if (s.anchorNode.nodeType === Node.TEXT_NODE) {
			if (s.anchorOffset === 0) right = 0;
			n = n.parentElement;
		}
		if (n.isContentEditable) break sel;
		move_cursor_to(n,right);
		n.parentElement.focus();
	}
bef:if (s.anchorNode.nodeType !== Node.TEXT_NODE || s.anchorOffset === s.anchorNode.textContent.length) {
		let n = s.anchorNode;
		if (n.nodeType === Node.TEXT_NODE) n = n.nextSibling;
		else n = n.childNodes[s.anchorOffset];
		if (!n || !n.classList?.contains("editable")) break bef;
		$(n).addClass("cbefore");
	}
aft:if (s.anchorNode.nodeType !== Node.TEXT_NODE || s.anchorOffset === 0) {
		let n = s.anchorNode;
		if (n.nodeType === Node.TEXT_NODE) n = n.previousSibling;
		else n = n.childNodes[s.anchorOffset-1];
		if (!n || !n.classList?.contains("editable")) break aft;
		$(n).addClass("cafter");
	}
}
$(document).on("selectionchange", cursor);
$("#new").on("focus", cursor);
$("#new").on("blur", () => s.removeAllRanges());

export function get_new(is_after) {
	return $(`<p id="new" contenteditable="plaintext-only" data-isafter="${is_after}"></p>`)
	.on("keydown", input).on("click", (e) => {
		if ($(".edit-inside").get(0) && !e.originalEvent.target.classList.contains("edit-inside")) cancel_edit_inside(false);
		if (e.originalEvent.target.classList.contains("editable")) edit_inside(e.originalEvent.target);
	});
}

function edit_inside(e) {
	$("#new").attr("contenteditable", "false");
	$(".edit-inside").off("blur");
	$(".edit-inside").attr("contenteditable", "false");
	$(".edit-inside").removeClass("edit-inside");
	$(e).attr("contenteditable", "plaintext-only");
	$(e).addClass("edit-inside");
	$(e).on("blur", ()=>cancel_edit_inside(false));
	e.focus();
}

function cancel_edit_inside(parent,right) {
	$(".edit-inside").off("blur");
	$(".edit-inside").attr("contenteditable", "false");
	$(".edit-inside").get(0).blur();
	$("#new").html($("#new").html().replace("&nbsp;"," ").replace("\uFFFC"," "));
	s.removeAllRanges();
	if (!parent) {
		$("#new").attr("contenteditable", "plaintext-only");
		move_cursor_to($(".edit-inside"),1);
		$(".edit-inside").removeClass("edit-inside");
		return;
	}
	let p = $(".edit-inside").get(0).parentNode;
	move_cursor_to($(".edit-inside"),(right?1:0));
	$(".edit-inside").removeClass("edit-inside");
	if (p.id === "new") {
		$("#new").attr("contenteditable", "plaintext-only");
		p.focus();
		return;
	}
	edit_inside(p);
}

function cmd_entry(cmd1, cmd2) {
	if (cmd2.length > 1) throw "항목 - 인자가 너무 많음";
	// entry
	let kind = cmd1.charAt(2);
	let id = parseInt(cmd1.slice(3));
	if ("s d t g w i".split(' ').indexOf(kind) !== -1) {
		let ins = $(`<data class="e ${kind}" value="${id}">${id}${cmd2.length?' ':''}</data>`);
		return [3,ins,cmd2[0]];
	}
	throw "항목 - 종류가 올바르지 않음";
}
function cmd_ref(cmd1, cmd2) {
	if (cmd2.length > 1) throw "언급 - 인자가 너무 많음";
	// reference
	let id = cmd1.slice(3);
	if (d$(`a${id}`)) {
		let cls = d$(`a${id}`).classList;
		let kind = get_kind(cls);
		if (kind != 'x') {
			let ins = $(`<data class="e ref ${kind}" value="${id}">${id}${cmd2.length?' ':''}</data>`);
			return [3,ins,cmd2[0]];
		}
	}
	if ($("#type_pending").length) throw "언급 - 충돌 방지(재시도하면 됨)";
	let ins = $(`<data id="type_pending" class="e ref block" value="${id}">${id}${cmd2.length?' ':''}</a>`);
	fetchget(`/cycelog/find/entry?id=${id}`).then((res) => {
		$("#type_pending").addClass(res.type).removeClass("block").attr("id",null);
	}).catch(() => {
		$("#type_pending").replaceWith($(`<span class="error block" contenteditable="false">오류</span>`));
	});
	return [3,ins,cmd2[0]];
}
function cmd_add(cmd1, cmd2) {
	if (cmd2.length > 0) throw "추가 - 인자가 너무 많음";
	let ins = null
	if (cmd1 === "{a#") ins = $(`<data class="e add"></data>`);
	else if (cmd1 === "{a#1") ins = $(`<data class="e add add1"></data>`);
	else if (cmd1 === "{a#3") ins = $(`<data class="e add add3"></data>`);
	else if (cmd1 === "{a#i") ins = $(`<data class="e add i"></data>`);
	else throw "추가 - 올바르지 않은 명령";
	return [1,ins];
}
var zero_star = new Date(2025, 1, 6);
var zero_zero = new Date(2025, 1, 9);
function cmd_time(cmd1, cmd2) {
	if (cmd2.length > 1) throw "시간 - 인자가 너무 많음";
	let data = cmd1.slice(2);
	let ins = null;
	if (data.length === 2) {
		if (cmd2.length === 0 || cmd2[0]?.length>1) throw "시간(추정) - 올바르지 않은 인자(첫 번째 인자는 생략할 수 없으며 텍스트로만 구성돼야 함)";
		let detected = cmd2[0][0].match(/^(\d+)월 (\d+)일(?: (\d+)시(?:(?:경?(?:에서|부터) (\d+)시경$)|경$)|$)/);
		if (detected == null) throw "시간(추정) - 추정 실패, /^(\d+)월 (\d+)일(?: (\d+)시(?:(?:경?(?:에서|부터) (\d+)시경$)|경$)|$)/ 꼴로 입력";
		let week = $("#new").parent();
		let year = 2000 + parseInt(data); // TODO: 2100년에 여기 업데이트하기
		let date = new Date(year, detected[1]-1, detected[2]);
		let order = null, day = null;
		if (date - zero_star === 0) {
			order = -1;
			day = 0;
		} else {
			let diff = Math.round((date - zero_zero)/86400000);
			order = Math.floor(diff/7);
			day = ((diff%7)+7)%7;
			if ((order === -1 || order === parseInt(week.attr("data-order"))-1) && day>=5) {
				order += 1;
				day += 3; // -7 +10
			}
			if (order === parseInt(week.attr("data-order"))+1 && day === 0) {
				order -= 1;
				day = 7;
			}
		}
		if ($("#timestamp_pending").length || $("#datetime_pending").length) throw "시간 - 충돌 방지(재시도하면 됨)";
		ins = $(`<time id="timestamp_pending" class="block">${cmd2[0][0]}</time>`);
		fetchget(`/cycelog/find/timestamp?order=${order}&day=${day}${detected[3]?`&hour=${detected[3]}`:''}${detected[4]?`&end_hour=${detected[4]}`:''}`).then((res) => {
			$("#timestamp_pending").attr("data-time",res).attr("id","datetime_pending");
			fetchget(`/cycelog/find/datetime?timestamp=${res}`).then((res) => {
				$("#datetime_pending").attr("datetime",res).removeClass("block").attr("id",null);
			}).catch(() => {
				$("#datetime_pending").replaceWith($(`<span class="error block" contenteditable="false">오류</span>`));
			});
		}).catch(() => {
			$("#timestamp_pending").replaceWith($(`<span class="error block" contenteditable="false">오류</span>`));
		});
		return [3,ins];
	} else {
		if (!/^\d{4}(\d\d(\.\d\d)?)?$|^0\*(\d\d(\.\d\d)?)?$/.test(data)) throw "시간 - 타임스탬프 형식이 올바르지 않음";
		if ($("#timestamp_pending").length || $("#datetime_pending").length) throw "시간 - 충돌 방지(재시도하면 됨)";
		let incl_year = true;
		if (cmd2[0]?.length === 1 && cmd2[0][0] === "") {
			cmd2 = [];
			incl_year = false;
		}
		let incl_time = /^\d{6}(\.\d\d)?$|^0\*\d\d(\.\d\d)?$/.test(data);
		ins = $(`<time id="datetime_pending" class="block" data-time="${data}">${cmd2.length?'':'...'}</time>`);
		fetchget(`/cycelog/find/datetime?timestamp=${data}`).then((res) => {
			if (!cmd2.length) $("#datetime_pending").text(format_date(res, incl_time, !incl_year));
			$("#datetime_pending").attr("datetime",res).removeClass("block").attr("id",null);
		}).catch(() => {
			$("#datetime_pending").replaceWith($(`<span class="error block" contenteditable="false">오류</span>`));
		});
		return [3,ins,cmd2[0]];
	}
}
function cmd_person(cmd1, cmd2) {
	if (cmd2.length > 2) throw "인물 - 인자가 너무 많음";
	let data = cmd1.slice(2);
	if (data.endsWith("=")) {
		// canon
		data = data.slice(0, -1);
		if (cmd2.length === 0 || cmd2[0]?.length>1) throw "인물(등록) - 올바르지 않은 인자(첫 번째 인자는 생략할 수 없으며 텍스트로만 구성돼야 함)";
		if ($(`data.person[data-type="canon"][value="${data}"]`,$("#new")).length) throw "인물(등록) - 같은 문단에서 이미 등록된 인물";
		let ins = $(`<data class="person" data-type="canon" value="${data}" data-name="${cmd2[0][0]}">${cmd2.length===2?'':cmd2[0][0]}</data>`);
		return [3,ins,cmd2[1]];
	}
	if (data.endsWith("~")) {
		// alias
		data = data.slice(0, -1);
		if (cmd2.length === 0 || cmd2[0]?.length>1) throw "인물(별명) - 올바르지 않은 인자(첫 번째 인자는 생략할 수 없으며 텍스트로만 구성돼야 함)";
		let ins = $(`<data class="person" data-type="alias" value="${data}" data-name="${cmd2[0][0]}">${cmd2.length===2?'':cmd2[0][0]}</data>`);
		return [3,ins,cmd2[1]];
	}
	// mention
	if (data === "") {
		// find
		if (cmd2.length === 0 || cmd2[0]?.length>1) throw "인물(추정) - 올바르지 않은 인자(첫 번째 인자는 생략할 수 없으며 텍스트로만 구성돼야 함)";
		if ($("#person_pending").length)  throw "인물(추정) - 충돌 방지(재시도하면 됨)";
		let ins = $(`<data class="person block" id="person_pending" data-type="mention">${cmd2.length===2?'':cmd2[0][0]}</data>`);
		fetchget(`/cycelog/find/person?name=${cmd2[0][0]}`).then((res) => {
			$("#person_pending").attr("value", res.code).removeClass("block").attr("id",null);
		}).catch(() => {
			$("#person_pending").replaceWith($(`<span class="error block" contenteditable="false">오류</span>`));
		});
		return [3,ins,cmd2[1]];
	}
	if (cmd2.length === 2) throw "인물(언급) - 인자가 너무 많음";
	if (cmd2.length === 1 && cmd2[0].length === 1 && cmd2[0][0] === "@") {
		// get canon name
		if ($("#name_pending").length) throw "인물(이름) - 충돌 방지(재시도하면 됨)";
		let ins = $(`<data class="person block" id="name_pending" data-type="mention" value="${data}">(@)</data>`);
		fetchget(`/cycelog/find/person?code=${data}`).then((res) => {
			$("#name_pending").text(res.name).removeClass("block").attr("id",null);
		}).catch(() => {
			$("#name_pending").replaceWith($(`<span class="error block" contenteditable="false">오류</span>`));
		});
		return [3,ins];
	}
	let ins = $(`<data class="person" data-type="mention" value="${data}">${cmd2.length?'':data}</data>`);
	return [3,ins,cmd2[0]];
}
function cmd_wrapper(cmd2) {
	if (cmd2.length > 1) throw "묶기 - 인자가 너무 많음";
	let ins = $(`<span class="wrapper"></span>`);
	return [6,ins,cmd2[0]];
}
function cmd_qm(cmd2) {
	if (cmd2.length > 1 || cmd2[0]?.length>1) throw "추가 정보 - 인자가 너무 많거나 텍스트만으로 이루어지지 않음";
	return [1, $(`<span class="qm"${cmd2.length?` data-why="${cmd2[0][0].replaceAll("\"","&quot;")}"`:''}>`)];
}
function cmd_format(cmd2, format) {
	if (cmd2.length > 1) throw `꾸미기(${format}) - 인자가 너무 많음`;
	let ins = $(format);
	return [6,ins,cmd2[0]];
}
function cmd_namu(cmd2) {
	if (cmd2.length > 0) throw "(...) - 인자를 왜 줌(...)";
	return [0,$(`<span class="namu">`)];
}
function cmd_placeholder(cmd1,cmd2) {
	if (cmd2.length > 1) throw "대체 - 인자가 너무 많음";
	let data = cmd1.slice(3);
	let ins = $(`<data class="placeholder" value="${data}">${cmd2.length?'':data}</data>`);
	return [6,ins,cmd2[0]];
}
function cmd_end(cmd2) {
	if (cmd2.length > 0) throw `주차 종료 - 인자가 너무 많음`;
	let ins = $(`<span class="weekend">그렇게 ${$("h2", $("#new").parent()).text()}가 끝났다.</span>`);
	return [0,ins,cmd2[0]];
}
function cmd_html(bef, aft, cmd2, format) {
	if ((bef != null && bef !== "") || (aft != null && aft !== "")) throw "문단 나눔 - 이것 외에는 내용이 없어야 함";
	if (cmd2.length > 0) throw "문단 나눔 - 인자가 없어야 함";
	let newhtml = $(format).attr("id", "new").addClass("newhtml").attr("data-isafter", $("#new").attr("data-isafter"));
	$("#new").replaceWith(newhtml);
	throw -1;
}
function cmd_fig(bef, aft, cmd2, els) {
	if ((bef != null && bef !== "") || (aft != null && aft !== "")) throw "정보 - 이것 외에는 내용이 없어야 함";
	if (cmd2.length <= 1) throw "정보 - 첫 번째 인자로 설명을, 그 다음부터 html을 제공해야 함";
	let flat = [];
	for (let i in cmd2) {
		if (i === "0") continue;
		if (cmd2[i].length > 1) throw -1;
		flat.push(cmd2[i][0]);
	}
	let html = flat.join("/");
	let newhtml = $(`<div id="new" class="newhtml" data-isafter="${$("#new").attr("data-isafter")}"></div>`);
	let fig = $(`<figure></figure>`);
	let cap = $(`<figcaption>`);
	put(cap, cmd2[0], els);
	fig.append(cap);
	let cont = $(`<div class="htmlwrapper">`);
	cont.get(0).innerHTML = html;
	fig.append(cont);
	newhtml.append(fig);
	$("#new").replaceWith(newhtml);
	throw -1;
}
function cmd_middot(cmd2) {
	if (cmd2.length > 0) throw "가운뎃점 - 인자가 없어야 함";
	return [8,"·"];
}