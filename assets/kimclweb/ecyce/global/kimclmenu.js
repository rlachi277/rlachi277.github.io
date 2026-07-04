export class KimclMenuElement extends HTMLElement {
	#sr = null;
	
	constructor() {
		super();
		this.#sr = this.attachShadow({mode:'open'});
	}
	
	async fetch_from_file() {
		try {
			const res = await fetch('/assets/kimclweb/ecyce/global/kimclmenu.html');
			const text = await res.text();
			this.#sr.innerHTML = text.match(/(?<=<template>).*?(?=<\/template>)/s);
			let sc = this.#sr.getElementById('script');
			let nsc = document.createElement('script');
			nsc.type = "module";
			nsc.append(sc.innerHTML);
			this.#sr.replaceChild(nsc, sc);
		} catch (err) {
			console.error(err);
			this.#sr.innerHTML = `error lol`;
		}
	}

	connectedCallback() {
		this.fetch_from_file();
	}
}

customElements.define('kimcl-menu', KimclMenuElement);