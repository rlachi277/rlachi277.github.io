import __dirname from '../dirname.js';
import { get_post_raw } from './posts.js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';

export function render(data, cur, init) {
	let eltype = null;
	let void_element = false;
	let eldata = "";
	if (typeof data === 'string' || data instanceof String) {
		return sani(data);
	}
	let elmiddle = "";
	data.children?.forEach((e) => {
		let d = render(e, cur);
		if (d != null) elmiddle += d;
	});
	if (init || data.type === 'body') {
		return elmiddle;
	} else {
		switch (data.type) {
		case 'nav':
			return render_nav(data.variant?.data, cur);
		case 'br':
			void_element = true;
		case 'section': case 'hgroup':
		case 'fieldset': case 'ul': case 'details':
		case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
		case 'figcaption': case 'legend':
		case 'li': case 'summary':
		case 'strong': case 'em': case 'b': case 'i': case 'u':
		case 'ruby': case 'rt': case 'rp':
		case 'sub': case 'sup': case 'ins': case 'del':
			eltype = data.type;
			break;
		case 'hr':
			eltype = "hr";
			if (data.variant?.rule) eldata = ` class="rule"`;
			break;
		case 'article': case 'figure':
			eltype = data.type;
			switch (data.variant?.float) {
				case 'right': eldata = ` class="float-right"`; break;
				case 'left': eldata = ` class="float-left"`; break;
			}
			break;
		case 'p':
			eltype = "p";
			if (data.variant?.lang != null) eldata = ` lang="${sani(data.variant?.lang)}"`;
			break;
		case 'img':
			eltype = "img";
			void_element = true;
			if (data.variant?.src != null) eldata += ` src="${sani(assets(data.variant?.src, cur))}"`;
			if (data.variant?.alt != null) ` alt="${sani(data.variant?.alt)}"`;
			switch (data.variant?.size) {
				case 'large': eldata += ` class="large"`; break;
				case 'small': eldata += ` class="small"`; break;
				case 'full': eldata += ` class="full"`; break;
			}
			break;
		case 'ol':
			eltype = "ol";
			if (data.variant?.start != null) eldata = ` start="${sani(data.variant?.start)}"`;
			break;
		case 'audio':
			eltype = "audio";
			if (data.variant?.src != null) eldata += ` src="${sani(assets(data.variant?.src, cur))}"`;
			if (data.variant?.controls != null) eldata += ` controls="${sani(data.variant?.controls)}"`;
			if (data.variant?.crossorigin != null) eldata += ` crossorigin="${sani(data.variant?.crossorigin)}"`;
			if (data.variant?.loop != null) eldata += ` loop="${sani(data.variant?.loop)}"`;
			if (data.variant?.muted != null) eldata += ` muted="${sani(data.variant?.muted)}"`;
			if (data.variant?.preload != null) eldata += ` preload="${sani(data.variant?.preload)}"`;
			break;
		case 'video':
			eltype = "video";
			if (data.variant?.src != null) eldata += ` src="${sani(assets(data.variant?.src, cur))}"`;
			if (data.variant?.autoplay != null) eldata += ` autoplay="${sani(data.variant?.autoplay)}"`;
			if (data.variant?.controls != null) eldata += ` controls="${sani(data.variant?.controls)}"`;
			if (data.variant?.crossorigin != null) eldata += ` crossorigin="${sani(data.variant?.crossorigin)}"`;
			if (data.variant?.loop != null) eldata += ` loop="${sani(data.variant?.loop)}"`;
			if (data.variant?.muted != null) eldata += ` muted="${sani(data.variant?.muted)}"`;
			if (data.variant?.poster != null) eldata += ` poster="${sani(assets(data.variant?.poster, cur))}"`;
			if (data.variant?.preload != null) eldata += ` preload="${sani(data.variant?.preload)}"`;
			if (data.variant?.autoplay != null) eldata += ` autoplay="${sani(data.variant?.autoplay)}"`;
			switch (data.variant?.size) {
				case 'large': eldata += ` class="large"`; break;
				case 'small': eldata += ` class="small"`; break;
				case 'full': eldata += ` class="full"`; break;
			}
			break;
		case 'track':
			eltype = "track";
			if (data.variant?.src != null) eldata += ` src="${sani(assets(data.variant?.src, cur))}"`;
			if (data.variant?.srclang != null) eldata += ` srclang="${sani(data.variant?.srclang)}"`;
			if (data.variant?.default != null) eldata += ` default="${sani(data.variant?.default)}"`;
			if (data.variant?.kind != null) eldata += ` kind="${sani(data.variant?.kind)}"`;
			if (data.variant?.label != null) eldata += ` label="${sani(data.variant?.label)}"`;
			break;
		case 'source':
			// currently <audio>, <video> only
			eltype = "source";
			if (data.variant?.src != null) eldata += ` src="${sani(assets(data.variant?.src, cur))}"`;
			if (data.variant?.media != null) eldata += ` media="${sani(data.variant?.media)}"`;
			break;
		case 'a':
			eltype = "a";
			if (data.variant?.href != null) eldata += ` href="${sani(data.variant?.href)}"`;
			if (data.variant?.target != null) eldata += ` target="${sani(data.variant?.target)}"`;
			if (data.variant?.download != null) eldata += ` download="${sani(data.variant?.download)}"`;
			if (data.variant?.rel != null) eldata += ` rel="${sani(data.variant?.rel)}"`;
			switch (data.variant?.shape) {
				case 'broken':
					eldata += ` class="broken"`;
					break;
				case 'color':
					eldata += ` class="color c${data.variant?.color}"`;
					break;
				case 'colorbox':
					eldata += ` class="colorbox c${data.variant?.color}"`;
					break;
			}
			break;
		case 'button':
			eltype = "button";
			// todo: button attributes
			switch (data.variant?.shape) {
				case 'color':
					eldata += ` class="color c${data.variant?.color}"`;
					break;
				case 'colorbox':
					eldata += ` class="colorbox c${data.variant?.color}"`;
					break;
			}
			break;
		case 'columns':
			eltype = "div";
			eldata = ` class="columns"`;
			break;
		case 'color':
			eltype = "span";
			eldata = ` class="color${data.variant?.click?" click":""} c${data.variant?.color}"`;
			break;
		case 'colorbox':
			eltype = "span";
			eldata = ` class="colorbox${data.variant?.click?" click":""} c${data.variant?.color}"`;
			break;
		case 'freehtml':
			return `<div class="freehtml">${data.variant?.html}</div>`;
		default:
			return null;
		}
	}
	if (void_element) return `<${eltype}${eldata}>`;
	return `<${eltype}${eldata}>${elmiddle}</${eltype}>`;
}

function sani(s) {
	// 막기 귀찮아요
	// 여러분 XSS는 하면 안 되는 겁니다
	return s
		.replaceAll(/&/g, "&amp;")
		.replaceAll(/"/g, "&quot;")
		.replaceAll(/</g, "&lt;")
		.replaceAll(/>/g, "&gt;");
}

function assets(src, cur) {
	if (src.startsWith("/")) return src;
	let url = new URL(src, `file://${cur.replace(/^\/posts\//, "/assets/")}`);
	return url.pathname;
}

function render_nav(data, cur) {
	function make_li(base, data) {
		let new_data = data;
		if (typeof data === 'string' || data instanceof String) {
			new_data = { name: data, children: [] };
		}
		let link = base + new_data.name;
		let is_self = simulate_link(cur, link ? link : "./") === cur;
		let exists = file_exists(cur, link ? link : "./");
		let a = `<a${is_self ?
			` class="self"`
		: (!exists ? 
			` class="broken"` : '')} href="${link ? link : "./"}">${(!link || base) ?
			`<span class="nav-base">${sani(link ? base : "./")}</span>`
		: ''}${
			sani(new_data.name)
		}</a>`;
		if (new_data.children.length === 0) return `<li>${a}</li>`;
		let ul_middle = "";
		for (let e of new_data.children) ul_middle += make_li(link, e);
		return `<li>${a}<ul>${ul_middle}</ul></li>`;
	}
	let middle = "";
	for (let e of data) middle += make_li("", e);
	return `<nav><details open><summary>둘러보기</summary><menu>${middle}</menu></details></nav>`;
}

function simulate_link(cur, p) {
	let pathname = new URL(p, `file://${cur}`).pathname;
	if (pathname.endsWith('/')) pathname += "index.html";
	return pathname;
}

export function file_exists(cur, p) {
	let resolved = simulate_link(cur, p);
	if (!resolved) return false;
	if (resolved.startsWith("/posts/")) return get_post_raw(resolved.replace(/^\/posts\//, ""))!=undefined;
	return fs.existsSync(fileURLToPath(new URL(
		resolved.slice(1), pathToFileURL(__dirname+path.sep)
	).href));
}