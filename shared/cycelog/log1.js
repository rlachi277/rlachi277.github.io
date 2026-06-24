import { sani } from "../posts/seri.js";

export const LOG1_TYPE_NAME = Object.freeze([
	"",
	"공부",
	"대화",
	"생각",
	"일상",
	"작업",
	"정보"
]);

const LOG1_THEAD = `<thead id="log1-thead">
	<tr>
		<th scope="col">번호</th>
		<th scope="col">유형</th>
		<th scope="col">시간</th>
		<th scope="col">내용</th>
	</tr>
</thead>`.replaceAll(/\n|\t/g, '');

const LOG1_TFOOT = `<tfoot><tr id="log1-new-entry">
	<td id="log1-new-id"></td>
	<td id="log1-new-type"></td>
	<td id="log1-new-time"></td>
	<td id="log1-new-content"></td>
</tr></tfoot>`.replaceAll(/\n|\t/g, '');

export function buildLog1Table(data) {
	if (data.length === 0) return `<table id="log1-table" role="grid">
		${LOG1_THEAD}
		<tbody></tbody>
		${LOG1_TFOOT}
	</table>`.replaceAll(/\n|\t/g, '');

	const ids = data.map((e) => e.id);
	const maxId = Math.max(...ids);
	const minId = Math.min(...ids);
	const dataById = [];
	for (const e of data) dataById[e.id] = e;
	let rows = '';
	for (let i = minId; i <= maxId; i++) rows += buildLog1Row(i, dataById[i]);
	return `<table id="log1-table" role="grid">
		${LOG1_THEAD}
		<tbody>${rows}</tbody>
		${LOG1_TFOOT}
	</table>`.replaceAll(/\n|\t/g, '');
}

export function buildLog1Row(id, data) {
	return `<tr data-row="${id}"
	${data?.id != undefined ? ` data-id="${data.id}"` : ''}
	${data?.type != undefined ? ` data-type="${data.type}"` : ''}
	${data?.time != undefined ? ` data-time="${sani(data.time)}"` : ''}>
		<td class="log1-td-id">${data?.id != undefined ? data.id : ''}</td>
		<td class="log1-td-type">${data?.type != undefined ? LOG1_TYPE_NAME[data.type] : ''}</td>
		<td class="log1-td-time"><span class="log1-time-wrapper">${data?.time != undefined ? sani(data.time) : ''}</span></td>
		<td class="log1-td-content">${data?.content != undefined ? sani(data.content) : ''}</td>
	</tr>`.replaceAll(/\n|\t/g, '');
}
