import "../../colors.css";
import "../../posts/style.css";
import "../colors.css";
import "../log3.css";

import type { MenubarData } from "../../posts/menubar.js";

import { setup } from "../log3_script.js";
import { defaultMenu, editMenu } from "../log3_menu.js";

const menu: MenubarData[] = [{
	text: "파일",
	edit: [false, true, true],
	submenu: [
		{text: "JSON으로 저장", action: "export", filter: [true, false, false]},
		{text: "JSON에서 불러오기...", action: "load", filter: [true, false, true], edit: true},
		{text: "새 글...", action: "new", edit: true},
		{text: "이 글 삭제...", action: "delete", filter: [true, false, false], edit: true}
	]
}, {
	text: "편집",
	submenu: [
		{text: "편집 시작", action: "startEdit"},
		{text: "편집 종료", action: "stopEdit", edit: true}
	]
}, {
	text: "삽입",
	filter: [true, false, false],
	edit: true,
	submenu: [
		{text: "주차 추가", action: "insertWeek"},
		{text: "문단 삽입", action: "insertP"},
		{text: "<section> 삽입", action: "insertSection"},
		{text: "<fieldset> 삽입", action: "insertFieldset"},
		{text: "<legend> 삽입", action: "insertLegend"},
		{text: "다단 레이아웃 삽입", action: "insertColumns"},
		{text: "요소 삭제", action: "deleteElement"},
		{text: "삽입/삭제 중단", action: "stopTargeting"}
	]
}, {
	text: "기록",
	submenu: [
		{text: "1차 기록 보기", action: "toLog1"},
		{text: "항목 강조 해제", action: "removeMark", filter: [true, false, false]}
	]
}] as const;

setup(menu, defaultMenu, editMenu);
