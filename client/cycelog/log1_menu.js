import { d$n } from "../query.js";
import { dialog, showWarning } from "../posts/dialog.js";
import { defaultMenu as superDefaultMenu, editMenu as superEditMenu } from "../posts/menu.js";
export const defaultMenu = {
    export: async () => {
        try {
            const res = await fetch(`${window.location.origin}${window.location.pathname}/raw`);
            if (!res.ok)
                throw res.status;
            const data = await res.json();
            const file = new Blob([JSON.stringify(data)], { type: "application/json" });
            const anchor = document.createElement("a");
            anchor.href = URL.createObjectURL(file);
            anchor.download = "export.json";
            anchor.click();
            URL.revokeObjectURL(anchor.href);
        }
        catch (e) {
            alert(`오류: ${e}`);
        }
    },
    startEdit: superDefaultMenu.startEdit,
    toLog3: () => {
        const path = `../log3/${window.location.pathname.split('/').at(-1)}${window.location.search}`;
        window.location.href = path;
    },
    removeMark: () => {
        sessionStorage.setItem('scrollY', window.scrollY.toString());
        window.location.href = window.location.pathname + window.location.search;
    }
};
export const editMenu = {
    new: dialog("새 글", `
		<label for="dialog-new-id">식별자: </label>
		<input id="dialog-new-id" placeholder="식별자 입력">
	`, async () => {
        const id = d$n("dialog-new-id").value;
        const path = `../log3/${id}`;
        if (!id || id.includes('/') || id.includes('.')) {
            showWarning("식별자가 적절하지 않습니다.");
            return false;
        }
        try {
            const res = await fetch(path, { method: "HEAD" });
            if (res.status !== 404) {
                if (res.status !== 200)
                    throw res.status;
                showWarning("해당 식별자를 가지는 글이 이미 있습니다.");
                return false;
            }
            const res2 = await fetch(path, { method: "PUT", body: JSON.stringify({
                    type: "body",
                    children: [
                        { type: "h1", children: [`끾기록: ${id}`] },
                        { type: "nav", children: null }
                    ]
                }) });
            if (!res2.ok)
                throw res2.status;
            window.location.reload();
            return true;
        }
        catch (e) {
            alert(`오류: ${e}`);
            return false;
        }
    }),
    delete: dialog("이 글 삭제", `
		정말로 <strong>이 글 전체</strong>를 삭제하시겠습니까?<br>
		<strong style="color: var(--c-1);">3차 기록 및 1차 기록 전부가 삭제됩니다.</strong><br>
		이 작업은 되돌릴 수 없습니다.
	`, async () => {
        try {
            const path = `../log3/${window.location.pathname.split('/').at(-1)}`;
            const res = await fetch(path, { method: "DELETE" });
            if (!res.ok)
                throw res.status;
            window.location.reload();
            return true;
        }
        catch (e) {
            alert(`오류: ${e}`);
            return false;
        }
    }, true),
    stopEdit: superEditMenu.stopEdit
};
