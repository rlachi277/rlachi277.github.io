const SIMPLE_TYPES = new Set([
    "section", "hgroup",
    "fieldset", "ul", "details",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "figcaption", "legend",
    "li", "summary",
    "strong", "em", "b", "i", "u", "s",
    "ruby", "rt", "rp",
    "sub", "sup", "ins", "del"
]);
export function seri(el, init = false, hooks = []) {
    if (el instanceof Text) {
        if (/^\n\s*$/.test(el.textContent))
            return null;
        return el.textContent.replaceAll(/\n\s*/g, "");
    }
    if (!(el instanceof Element))
        return null;
    if (el.classList.contains("new") && !init)
        return null;
    const children = [];
    el.childNodes.forEach((e) => {
        const child = seri(e, false, hooks);
        if (child !== null)
            children.push(child);
    });
    for (const e of hooks) {
        const hookResult = e(el, init);
        if (hookResult !== undefined) {
            if (hookResult === null || typeof hookResult === 'string')
                return hookResult;
            return {
                type: hookResult.type,
                ...(hookResult.variant !== undefined && { variant: hookResult.variant }),
                children: (hookResult.children === null) ? null : children
            };
        }
    }
    const result = {
        type: "",
        children: children
    };
    if (SIMPLE_TYPES.has(el.nodeName.toLowerCase())) {
        result.type = el.nodeName.toLowerCase();
        return result;
    }
    switch (init ? 'BODY' : el.nodeName) {
        case 'BODY':
            result.type = "body";
            break;
        case 'NAV':
            result.children = null;
            result.type = "nav";
            break;
        case 'ARTICLE':
            result.type = "article";
            result.variant = { float: null };
            if (el.classList.contains('float-right'))
                result.variant.float = "right";
            else if (el.classList.contains('float-left'))
                result.variant.float = "left";
            break;
        case 'HR':
            result.variant = { rule: null };
            if (el.classList.contains('rule'))
                result.variant.rule = true;
        case 'BR':
            result.children = null;
            result.type = el.nodeName.toLowerCase();
            break;
        case 'P':
            result.type = "p";
            result.variant = getAttributes(el, ["lang"]);
            break;
        case 'FIGURE':
            result.type = "figure";
            result.variant = { float: null };
            if (el.classList.contains('float-right'))
                result.variant.float = "right";
            else if (el.classList.contains('float-left'))
                result.variant.float = "left";
            break;
        case 'IMG':
            result.type = "img";
            result.variant = {
                size: seriSize(el),
                ...getAttributes(el, ["src", "alt"])
            };
            result.children = null;
            break;
        case 'OL':
            result.type = 'ol';
            result.variant = getAttributes(el, ["start"]);
            break;
        case 'AUDIO':
            result.type = "audio";
            result.variant = getAttributes(el, [
                "src", "controls", "crossorigin", "loop", "muted", "preload"
            ]);
            break;
        case 'VIDEO':
            result.type = "video";
            result.variant = {
                size: seriSize(el),
                ...getAttributes(el, [
                    "src", "autoplay", "controls", "crossorigin", "loop",
                    "muted", "poster", "preload"
                ])
            };
            break;
        case 'TRACK':
            result.type = "track";
            result.variant = getAttributes(el, [
                "src", "srclang", "default", "kind", "label"
            ]);
            break;
        case 'SOURCE':
            // currently <audio>, <video> only
            result.type = "source";
            result.variant = getAttributes(el, ["src", "media"]);
            break;
        case 'A':
            result.type = "a";
            result.variant = getAttributes(el, [
                "href", "target", "download", "rel"
            ]);
            result.variant.shape = null;
            if (el.classList.contains("broken")) {
                result.variant.shape = "broken";
            }
            else if (el.classList.contains("color")) {
                result.variant.shape = "color";
                result.variant.color = getColor(el.classList);
            }
            else if (el.classList.contains("colorbox")) {
                result.variant.shape = "colorbox";
                result.variant.color = getColor(el.classList);
            }
            break;
        case 'BUTTON':
            result.type = "button";
            result.variant = {};
            if (el.classList.contains("colorbox")) {
                result.variant.shape = "colorbox";
                result.variant.color = getColor(el.classList);
            }
            break;
        default:
            if (el.classList.contains("columns")) {
                result.type = "columns";
            }
            else if (el.classList.contains("color")) {
                result.type = "color";
                result.variant = { color: getColor(el.classList), click: el.classList.contains("click") };
            }
            else if (el.classList.contains("colorbox")) {
                result.type = "colorbox";
                result.variant = { color: getColor(el.classList), click: el.classList.contains("click") };
            }
            else {
                return null;
            }
    }
    return result;
}
function seriSize(el) {
    if (el.classList.contains("full"))
        return "full";
    if (el.classList.contains("large"))
        return "large";
    if (el.classList.contains("small"))
        return "small";
    return "medium";
}
function getAttributes(el, names) {
    const variant = {};
    for (const e of names) {
        variant[e] = el.getAttribute(e)?.replaceAll("\n", "") ?? null;
    }
    return variant;
}
export function getColor(classList) {
    for (let i = 0; i <= 10; i++) {
        if (classList.contains(`c${i}`))
            return i;
    }
    return -1;
}
export function deseri(data, cur, init = false, hooks = []) {
    if (typeof data === 'string')
        return sani(data);
    let children = "";
    data.children?.forEach((e) => {
        const child = deseri(e, cur, false, hooks);
        if (child !== null)
            children += child;
    });
    for (const e of hooks) {
        const hookResult = e(data, cur, init);
        if (hookResult !== undefined) {
            if (hookResult === null)
                return null;
            switch (hookResult.type) {
                case 'html':
                    return hookResult.html;
                case 'void':
                    return `<${hookResult.tagName}>`;
                default:
                    return `<${hookResult.tagName}${hookResult.attrs}>${children}</${hookResult.tagName}>`;
            }
        }
    }
    let tagName = null;
    let attrs = "";
    let isVoid = false;
    if (init || data.type === 'body')
        return children;
    if (SIMPLE_TYPES.has(data.type))
        return `<${data.type}>${children}</${data.type}>`;
    switch (data.type) {
        case 'nav':
        case 'br':
            isVoid = true;
            tagName = data.type;
            break;
        case 'hr':
            tagName = "hr";
            if (data.variant?.rule)
                attrs = ` class="rule"`;
            break;
        case 'article':
        case 'figure':
            tagName = data.type;
            switch (data.variant?.float) {
                case 'right':
                    attrs = ` class="float-right"`;
                    break;
                case 'left':
                    attrs = ` class="float-left"`;
                    break;
            }
            break;
        case 'p':
            tagName = "p";
            attrs += setAttributes(data.variant, ["lang"]);
            break;
        case 'img':
            tagName = "img";
            isVoid = true;
            if (data.variant?.src != null)
                attrs += ` src="${sani(assets(data.variant?.src, cur))}"`;
            attrs += setAttributes(data.variant, ["alt"]);
            attrs += deseriSize(data.variant?.size);
            break;
        case 'ol':
            tagName = "ol";
            if (data.variant?.start != null)
                attrs = ` start="${sani(data.variant?.start)}"`;
            break;
        case 'audio':
            tagName = "audio";
            if (data.variant?.src != null)
                attrs += ` src="${sani(assets(data.variant?.src, cur))}"`;
            attrs += setAttributes(data.variant, [
                "controls", "crossorigin", "loop", "muted", "preload"
            ]);
            break;
        case 'video':
            tagName = "video";
            if (data.variant?.src != null)
                attrs += ` src="${sani(assets(data.variant?.src, cur))}"`;
            attrs += setAttributes(data.variant, [
                "autoplay", "controls", "crossorigin", "loop",
                "muted", "poster", "preload"
            ]);
            attrs += deseriSize(data.variant?.size);
            break;
        case 'track':
            tagName = "track";
            if (data.variant?.src != null)
                attrs += ` src="${sani(assets(data.variant?.src, cur))}"`;
            attrs += setAttributes(data.variant, [
                "srclang", "default", "kind", "label"
            ]);
            break;
        case 'source':
            // currently <audio>, <video> only
            tagName = "source";
            if (data.variant?.src != null)
                attrs += ` src="${sani(assets(data.variant?.src, cur))}"`;
            attrs += setAttributes(data.variant, ["media"]);
            break;
        case 'a':
            tagName = "a";
            attrs += setAttributes(data.variant, ["href", "target", "download", "rel"]);
            switch (data.variant?.shape) {
                case 'broken':
                    attrs += ` class="broken"`;
                    break;
                case 'color':
                    attrs += ` class="color c${data.variant?.color}"`;
                    break;
                case 'colorbox':
                    attrs += ` class="colorbox c${data.variant?.color}"`;
                    break;
            }
            break;
        case 'button':
            tagName = "button";
            switch (data.variant?.shape) {
                case 'color':
                    attrs += ` class="color c${data.variant?.color}"`;
                    break;
                case 'colorbox':
                    attrs += ` class="colorbox c${data.variant?.color}"`;
                    break;
            }
            break;
        case 'columns':
            tagName = "div";
            attrs = ` class="columns"`;
            break;
        case 'color':
            tagName = "span";
            attrs = ` class="color c${data.variant?.color}${data.variant?.click ? " click" : ""}"`;
            break;
        case 'colorbox':
            tagName = "span";
            attrs = ` class="colorbox c${data.variant?.color}${data.variant?.click ? " click" : ""}"`;
            break;
        default:
            return null;
    }
    if (isVoid)
        return `<${tagName}${attrs}>`;
    else
        return `<${tagName}${attrs}>${children}</${tagName}>`;
}
function deseriSize(size) {
    let sizeClass = '';
    switch (size) {
        case 'large':
            sizeClass = ' large';
            break;
        case 'small':
            sizeClass = ' small';
            break;
        case 'full':
            sizeClass = ' full';
            break;
    }
    return ` class="loading${sizeClass}" onload="this.classList.remove('loading')"`;
}
function setAttributes(variant, names) {
    let result = '';
    for (const e of names) {
        if (variant?.[e] != null)
            result += ` ${e}="${sani(variant?.[e])}"`;
    }
    return result;
}
export function sani(s) {
    // 막기 귀찮아요
    // 여러분 XSS는 하면 안 되는 겁니다
    return s
        .replaceAll(/&/g, "&amp;")
        .replaceAll(/"/g, "&quot;")
        .replaceAll(/'/g, "&apos;")
        .replaceAll(/`/g, "&grave;")
        .replaceAll(/</g, "&lt;")
        .replaceAll(/>/g, "&gt;");
}
function assets(src, cur) {
    // 임시방편(파일 업로드 시스템 등이 구현된다면 바뀔 예정)
    if (src.startsWith("/"))
        return src;
    const url = new URL(src, `file://${cur.replace(/^\/posts\//, "/assets/")}`);
    return url.pathname;
}
