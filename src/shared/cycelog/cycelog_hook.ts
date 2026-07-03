import type { DeseriHook, SeriHook } from "../posts/seri.js";

export type WhereData = {
	readonly where: string,
	readonly type: number
};

export type WhereFunc = (id: number | undefined, refId: string) => WhereData;

let refCnt = 0;
export function entryDeseriHook(types: Record<number,number>, whereFunc: WhereFunc): DeseriHook {
	return function (data, cur) {
		const postId = cur.split('/').at(-1) as string;
		if (data.type === 'entry') {
			const id = (data.variant?.id ?? undefined) as number | undefined;
			const type = id !== undefined ? (types?.[id] ?? 0) : 0;
			const path = id !== undefined ? `../log1/${postId}#entry${id}` : '';
			return {
				type: 'html',
				html: `<a class="entry"${id !== undefined ? ` href="${path}" id="entry${id}" data-id="${id}"` : ''} data-type="${type}">
					#${id ?? "?"}
				</a>`.replaceAll(/\n|\t/g, '')
			} as const;
		} else if (data.type === 'ref') {
			const id = (data.variant?.id ?? undefined) as number | undefined;
			refCnt += 1;
			const refId = `ref${refCnt}`;
			let entryData: WhereData | undefined = undefined;
			if (id !== undefined && Object.hasOwn(types, id)) {
				entryData = {where: postId, type: types?.[id] ?? 0};
			}
			if (entryData === undefined) entryData = whereFunc(id, refId);
			const path = id !== undefined ? `./${entryData.where}#entry${id}` : '';
			return {
				type: 'html',
				html: `<a class="entry ref" id="${refId}"${id !== undefined ? ` href="${path}" data-id="${id}"` : ''} data-type="${entryData.type}">
					ref. #${id ?? "?"}
				</a>`.replaceAll(/\n|\t/g, '')
			} as const;
		}
		return undefined;
	};
}

export const entrySeriHook: SeriHook = function (el, _) {
	if (el.classList.contains("ref")) {
		return {
			type: 'ref',
			variant: {id: parseInt(el.getAttribute("data-id") ?? "")}, // NaN -> null
			children: null
		} as const;
	} else if (el.classList.contains("entry")) {
		return {
			type: 'entry',
			variant: {id: parseInt(el.getAttribute("data-id") ?? "")}, // NaN -> null
			children: null
		} as const;
	}
	return undefined;
}
