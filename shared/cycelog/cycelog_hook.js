let refCnt = 0;
const whereCache = {};
export function entryDeseriHook(types, isClient, param) {
    return function (data, cur) {
        const postId = cur.split('/').at(-1);
        if (data.type === 'entry') {
            const id = data.variant?.id;
            const type = types?.[id] ?? 0;
            const path = id != undefined ?
                `../log1/${postId}#entry${id}` : '';
            return {
                type: 'html',
                html: `<a class="entry"${id != undefined ? ` href="${path}" id="entry${id}" data-id="${id}"` : ''} data-type="${type}">
					#${id ?? "?"}
				</a>`.replaceAll(/\n|\t/g, '')
            };
        }
        else if (data.type === 'ref') {
            const id = data.variant?.id;
            let entryData;
            refCnt += 1;
            const refId = `ref${refCnt}`;
            if (isClient) {
                // it is assumed that the log1 data doesn't change while the client is on the same page.
                // this assumption is valid, because the whole posts system assumes that there's only one session,
                // and if it's on log3, it's not on log1.
                if (typeof document === "undefined")
                    throw "이거 서버에서 쓰지 마세요";
                entryData = whereCache[id];
                if (entryData === undefined) {
                    if (Object.hasOwn(types, id)) {
                        entryData = { where: postId, type: types?.[id] ?? 0 };
                    }
                    else {
                        entryData = { where: "tmp", type: 0 };
                        clientWhere(param, id).then((newData) => {
                            whereCache[id] = newData;
                            const target = document.getElementById(refId);
                            if (target === null)
                                return;
                            target.setAttribute("href", `./${newData.where}#entry${id}`);
                            target.setAttribute("data-type", `${newData.type}`);
                        });
                    }
                }
            }
            else {
                entryData = serverWhere(param, id);
            }
            const path = id != undefined ? `./${entryData.where}#entry${id}` : '';
            return {
                type: 'html',
                html: `<a class="entry ref" id="${refId}"${id != undefined ? ` href="${path}"` : ''} data-id="${id}" data-type="${entryData.type}">
					ref. #${id ?? "?"}
				</a>`.replaceAll(/\n|\t/g, '')
            };
        }
        return undefined;
    };
}
export function entrySeriHook(data) {
    if (data.classList.contains("ref")) {
        return {
            type: 'ref',
            variant: { id: data.getAttribute("data-id") } // NaN -> null
        };
    }
    else if (data.classList.contains("entry")) {
        return {
            type: 'entry',
            variant: { id: data.getAttribute("data-id") } // NaN -> null
        };
    }
    return undefined;
}
async function clientWhere(root, id) {
    const res = await fetch(`${root}log1/where/${id}`);
    if (!res.ok)
        throw res.status;
    return await res.json();
}
export function serverWhere(db, id) {
    const dbResult = db.prepare(`SELECT post, type FROM entries WHERE id = ?`).get(id);
    if (dbResult === undefined)
        throw 404;
    return {
        where: dbResult.post,
        type: dbResult.type
    };
}
