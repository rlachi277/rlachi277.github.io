import type { WhereData, WhereFunc } from "../../shared/cycelog/cycelog_hook";

const whereCache: Record<number,WhereData> = {};
export function clientWhere(root: string): WhereFunc {
	return function (id, refId) {
		// it is assumed that the log1 data doesn't change while the client is on the same page.
		// this assumption is valid, because the whole posts system assumes that there's only one session,
		// and if it's on log3, it's not on log1.
		if (typeof document === "undefined") throw "이거 서버에서 쓰지 마세요";
		let result: WhereData | undefined = (id !== undefined) ? whereCache[id] : undefined;
		if (result !== undefined) return result;
		
		if (id !== undefined) {
			result = {where: "tmp", type: 0};
			(async (root: string, id: number) => {
				const res = await fetch(`${root}log1/where/${id}`);
				if (!res.ok) throw res.status;
				return await res.json();
			})(root, id).then((newData) => {
				whereCache[id] = newData;
				const target = document.getElementById(refId);
				if (target === null) return;
				target.setAttribute("href", `./${newData.where}#entry${id}`);
				target.setAttribute("data-type", `${newData.type}`);
			});
		} else {
			result = {where: "void", type: 0};
		}

		return result;
	}
}
