let refCnt = 0;
export function entryDeseriHook(types, whereFunc) {
    return function (data, cur) {
        const postId = cur.split('/').at(-1);
        if (data.type === 'entry') {
            const id = (data.variant?.id ?? undefined);
            const type = id !== undefined ? (types?.[id] ?? 0) : 0;
            const path = id !== undefined ? `../log1/${postId}#entry${id}` : '';
            return {
                type: 'html',
                html: `<a class="entry"${id !== undefined ? ` href="${path}" id="entry${id}" data-id="${id}"` : ''} data-type="${type}">
					#${id ?? "?"}
				</a>`.replaceAll(/\n|\t/g, '')
            };
        }
        else if (data.type === 'ref') {
            const id = (data.variant?.id ?? undefined);
            refCnt += 1;
            const refId = `ref${refCnt}`;
            let entryData = undefined;
            if (id !== undefined && Object.hasOwn(types, id)) {
                entryData = { where: postId, type: types?.[id] ?? 0 };
            }
            if (entryData === undefined)
                entryData = whereFunc(id, refId);
            const path = id !== undefined ? `./${entryData.where}#entry${id}` : '';
            return {
                type: 'html',
                html: `<a class="entry ref" id="${refId}"${id !== undefined ? ` href="${path}" data-id="${id}"` : ''} data-type="${entryData.type}">
					ref. #${id ?? "?"}
				</a>`.replaceAll(/\n|\t/g, '')
            };
        }
        return undefined;
    };
}
export const entrySeriHook = function (data, _) {
    if (data.classList.contains("ref")) {
        return {
            type: 'ref',
            variant: { id: parseInt(data.getAttribute("data-id") ?? "") }, // NaN -> null
            children: null
        };
    }
    else if (data.classList.contains("entry")) {
        return {
            type: 'entry',
            variant: { id: parseInt(data.getAttribute("data-id") ?? "") }, // NaN -> null
            children: null
        };
    }
    return undefined;
};
