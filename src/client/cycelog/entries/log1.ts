import "../../colors.css";
import "../../posts/style.css";
import "../style.css";
import "../table.css";
import "../log1.css";

import type { MenubarData } from "../../posts/menubar.js";

import { setup } from "../log1_script.js";
import { defaultMenu, editMenu } from "../log1_menu.js";

const menu: MenubarData[] = [{
	text: "파일",
	edit: [false, true, true],
	submenu: [
		{text: "JSON으로 저장", action: "export", filter: [true, false, false]},
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
	text: "기록",
	submenu: [
		{text: "3차 기록으로", action: "toLog3"},
		{text: "강조된 곳으로", action: "toMark", filter: [true, false, false]},
		{text: "강조 해제", action: "removeMark", filter: [true, false, false]},
		{text: "번호 필터", action: "restrictWithId", filter: [true, false, false]},
		{text: "주차 필터", action: "restrictWithWeek", filter: [true, false, false]}
	]
}] as const;

setup(menu, defaultMenu, editMenu);
