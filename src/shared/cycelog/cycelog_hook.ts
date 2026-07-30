import { sani, type DeseriHook, type SeriHook } from "../posts/seri.js";

export type WhereData = {
	readonly where: string,
	readonly type: number
};

export type WhereFunc = (id: number | undefined, refId: string) => WhereData;

export function cycelogDeseriHook(entryData: Record<number,[number,string,string]>, whereFunc: WhereFunc): DeseriHook {
	return function (data, cur) {
		const postId = cur.split('/').at(-1) as string;
		if (data.type === 'week') {
			return {
				type: 'normal',
				tagName: 'section',
				attrs: ` class="week"`
			};
		} else if (data.type === 'end-of-week') {
			return {
				type: 'normal',
				tagName: 'span',
				attrs: ` class="semantic end-of-week"`
			};
		} else if (data.type === 'entry') {
			const id = (data.variant?.id ?? undefined) as number | undefined;
			const date = (data.variant?.date ?? undefined) as string | undefined;
			if (id === 0 || id === -1 || id === -3) {
				return {
					type: 'html',
					html: `<span contenteditable="false" class="entry semantic" data-type="add" data-id="${id}" title="수첩 기록에 없었으나 ${id === 0 ? "이후" : (id === -1 ? "1차 기록 시" : "3차 기록 시")} 추가한 정보">
						${id === 0 ? "Add" : (id === -1 ? "Add1" : "Add3")}
					</span>`.replaceAll(/\n|\t/g, '')
				} as const;
			}
			const type = id !== undefined ? (entryData?.[id][0] ?? 0) : 0;
			const path = id !== undefined ? `../log1/${postId}#entry${id}` : '';
			return {
				type: 'html',
				html: `<a contenteditable="false" class="entry"${id !== undefined ? ` href="${sani(path)}" id="entry${id}" data-id="${id}" title="${id}번 항목(${sani(entryData?.[id][1] ?? '?')}) / ${sani(entryData?.[id][2] ?? '?')}"` : ''}${date !== undefined ? ` data-date="${sani(date)}"` : ''} data-type="${type}">
					#${id ?? "?"}${date !== undefined ? ` ${sani(date)}` : ''}
				</a>`.replaceAll(/\n|\t/g, '')
			} as const;
		} else if (data.type === 'ref') {
			const id = (data.variant?.id ?? undefined) as number | undefined;
			const refId = (data.variant?.refId as string | null | undefined) ?? `ref${Math.random().toString(36).substring(2)}`;
			let refData: WhereData | undefined = undefined;
			if (id !== undefined && Object.hasOwn(entryData, id)) {
				refData = {where: postId, type: entryData?.[id][0] ?? 0};
			}
			if (refData === undefined) refData = whereFunc(id, refId);
			const path = id !== undefined ? `./${refData.where}?ref=${postId}.${refId}#entry${id}` : '';
			return {
				type: 'html',
				html: `<a contenteditable="false" class="entry ref" id="${refId}"${id !== undefined ? ` href="${sani(path)}" data-id="${id}" title="${id}번 항목 참조"` : ''} data-type="${refData.type}">
					ref. #${id ?? "?"}
				</a>`.replaceAll(/\n|\t/g, '')
			} as const;
		}
		return undefined;
	};
}

export const cycelogSeriHook: SeriHook = function (el, _): ReturnType<SeriHook> {
	if (el.classList.contains("week")) {
		return {
			type: 'week',
			children: []
		} as const;
	} else if (el.classList.contains("end-of-week")) {
		return {
			type: 'end-of-week',
			children: []
		} as const;
	} if (el.classList.contains("entry")) {
		return {
			type: 'entry',
			variant: {id: parseInt(el.getAttribute("data-id") ?? ""), date: el.getAttribute("data-date") ?? null}, // NaN -> null
			children: null
		} as const;
	} else if (el.classList.contains("ref")) {
		return {
			type: 'ref',
			variant: {id: parseInt(el.getAttribute("data-id") ?? ""), refId: el.getAttribute("id") ?? null, date: el.getAttribute("data-date") ?? null}, // NaN -> null
			children: null
		} as const;
	}
	return undefined;
}