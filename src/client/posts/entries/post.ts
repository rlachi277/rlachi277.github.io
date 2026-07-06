import "../../colors.css";
import "../style.css";

import type { MenubarData } from "../menubar.js";

import { setup } from "../script.js";
import { defaultMenu, editMenu } from "../menu.js";

const menu: MenubarData[] = [{
	text: "파일",
	edit: [false, true, true],
	submenu: [
		{text: "JSON으로 저장", action: "export", filter: [true, false, false]},
		{text: "JSON에서 불러오기...", action: "load", filter: [true, false, true], edit: true},
		{text: "새 글...", action: "new", edit: true},
		{text: "이 글 복제...", action: "duplicate", filter: [true, false, false], edit: true},
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
		{text: "문단 삽입", action: "insertP"},
		{text: "<section> 삽입", action: "insertSection"},
		{text: "<article> 삽입", action: "insertArticle"},
		{text: "<fieldset> 삽입", action: "insertFieldset"},
		{text: "<legend> 삽입", action: "insertLegend"},
		{text: "다단 레이아웃 삽입", action: "insertColumns"},
		{text: "제목 삽입", action: "insertHeader"},
		{text: "부제 추가/삭제", action: "insertHgroup"},
		{text: "요소 삭제", action: "deleteElement"},
		{text: "삽입/삭제 중단", action: "stopTargeting"}
	]
}] as const;

setup(menu, defaultMenu, editMenu);
