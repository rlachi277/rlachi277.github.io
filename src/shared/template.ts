export const html = (strings: TemplateStringsArray, ...values: any[]) =>
	String.raw({ raw: strings.map((e) => e.replaceAll(/\n|\t/g, '')) }, ...values);