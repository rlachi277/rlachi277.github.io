export const d$ = (q: string) => document.getElementById(q);
export const q$ = (q: string, e: Element | null = null): HTMLElement | null => {
	if (e === null) return document.querySelector(q);
	else return e.querySelector(q);
}
export const d$n = (q: string) => document.getElementById(q) as HTMLElement;
export const q$n = (q: string, e: Element | null = null): HTMLElement => {
	if (e === null) return document.querySelector(q) as HTMLElement;
	else return e.querySelector(q) as HTMLElement;
}

export const $ = (q: string, e: Element | null = null) => new JQuerish(q, e);

class JQuerish {
	list: NodeListOf<HTMLElement>;
	constructor(query: string, element: Element | null) {
		if (element === null) this.list = document.querySelectorAll<HTMLElement>(query);
		else this.list = element.querySelectorAll<HTMLElement>(query);
	}

	get exists() { return this.list.length !== 0; }

	each(f: (e: HTMLElement) => any) {
		this.list.forEach(f);
	}

	attr(key: string, value: string | null | undefined = undefined): string | null | void {
		if (value === undefined) return this.list[0]?.getAttribute(key) ?? null;
		if (value === null) {
			this.each((e) => {
				e.removeAttribute(key);
			});
		} else {
			this.each((e) => {
				e.setAttribute(key, value);
			})
		}
	}

	css(key: string, value: string | null | undefined = undefined): string | null | void {
		if (value === undefined) return this.list[0]?.style.getPropertyValue(key) ?? null;
		if (value === null) {
			this.each((e) => {
				e.style.removeProperty(key)
			});
		} else {
			this.each((e) => {
				e.style.setProperty(key, value);
			})
		}
	}

	on<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, e: HTMLElementEventMap[K]) => any) {
		this.each((e) => {
			e.addEventListener(type, listener);
		})
	}

	off<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, e: HTMLElementEventMap[K]) => any) {
		this.each((e) => {
			e.removeEventListener(type, listener);
		})
	}

	remove() {
		this.each((e) => e.remove());
	}

	removeClass(classes: string) {
		const classList = classes.split(' ');
		this.each((e) => {
			e.classList.remove(...classList);
		})
	}
}