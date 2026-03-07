export function deseri(data, cur, init, recur=deseri) {
	let eltype = null;
	let void_element = false;
	let eldata = "";
	if (typeof data === 'string' || data instanceof String) {
		return sani(data);
	}
	let elmiddle = "";
	data.children?.forEach((e) => {
		let d = recur(e, cur);
		if (d != null) elmiddle += d;
	});
	if (init || data.type === 'body') {
		return elmiddle;
	} else {
		switch (data.type) {
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
				case 'large': eldata += ` class="loading large"`; break;
				case 'small': eldata += ` class="loading small"`; break;
				case 'full': eldata += ` class="loading full"`; break;
				default: eldata += ` class="loading"`;
			}
			eldata += ` onload="this.classList.remove('loading');"`
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
				case 'large': eldata += ` class="loading large"`; break;
				case 'small': eldata += ` class="loading small"`; break;
				case 'full': eldata += ` class="loading full"`; break;
				default: eldata += `class="loading"`;
			}
			eldata += ` onload="this.classList.remove('loading');"`
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
		default:
			return null;
		}
	}
	if (void_element) return `<${eltype}${eldata}>`;
	return `<${eltype}${eldata}>${elmiddle}</${eltype}>`;
}

export function sani(s) {
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