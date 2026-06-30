export const d$ = (q) => document.getElementById(q);
export const q$ = (q, e = null) => {
    if (e === null)
        return document.querySelector(q);
    else
        return e.querySelector(q);
};
export const d$n = (q) => document.getElementById(q);
export const q$n = (q, e = null) => {
    if (e === null)
        return document.querySelector(q);
    else
        return e.querySelector(q);
};
export const $ = (q, e = null) => new JQuerish(q, e);
class JQuerish {
    list;
    constructor(query, element) {
        if (element === null)
            this.list = document.querySelectorAll(query);
        else
            this.list = element.querySelectorAll(query);
    }
    get exists() { return this.list.length !== 0; }
    each(f) {
        this.list.forEach(f);
    }
    attr(key, value = undefined) {
        if (value === undefined)
            return this.list[0]?.getAttribute(key) ?? null;
        if (value === null) {
            this.each((e) => {
                e.removeAttribute(key);
            });
        }
        else {
            this.each((e) => {
                e.setAttribute(key, value);
            });
        }
    }
    css(key, value = undefined) {
        if (value === undefined)
            return this.list[0]?.style.getPropertyValue(key) ?? null;
        if (value === null) {
            this.each((e) => {
                e.style.removeProperty(key);
            });
        }
        else {
            this.each((e) => {
                e.style.setProperty(key, value);
            });
        }
    }
    on(type, listener) {
        this.each((e) => {
            e.addEventListener(type, listener);
        });
    }
    off(type, listener) {
        this.each((e) => {
            e.removeEventListener(type, listener);
        });
    }
    remove() {
        this.each((e) => e.remove());
    }
    removeClass(classes) {
        const classList = classes.split(' ');
        this.each((e) => {
            e.classList.remove(...classList);
        });
    }
}
