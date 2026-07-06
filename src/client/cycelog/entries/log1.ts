import "../../colors.css";
import "../../posts/style.css";
import "../colors.css";
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
		{text: "3차 기록 보기", action: "toLog3"},
		{text: "항목 강조 해제", action: "removeMark", filter: [true, false, false]}
	]
}] as const;

setup(menu, defaultMenu, editMenu);
