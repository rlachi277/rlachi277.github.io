const chcode = ['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g']
const jucode = ['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l']
const jocode = ['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g']
const cscode = ['','r','R','rt','s','sw','sg','e','E','f','fr','fa','fq','ft','fx','fv','fg','a','q','Q','qt','t','T','d','w','W','c','z','x','v','g']
export function k2e(str) {
	if (!str) return null;
	let result = '';
	for (const ch of str) {
		let c = ch.charCodeAt(0);
		if (0x1100 <= c && c <= 0x1112) { result += chcode[c - 0x1100]; continue; }
		if (0x1161 <= c && c <= 0x1175) { result += jucode[c - 0x1161]; continue; }
		if (0x11a8 <= c && c <= 0x11c2) { result += jocode[c - 0x11a7]; continue; }
		if (0x3131 <= c && c <= 0x314e) { result += cscode[c - 0x3130]; continue; }
		if (0x314f <= c && c <= 0x3163) { result += jucode[c - 0x314f]; continue; }
		if (0xac00 <= c && c <= 0xd7a3) {
			c -= 0xac00;
			const chidx = Math.floor(c / 588);
			const juidx = Math.floor((c%588) / 28);
			const joidx = c%28;
			result += chcode[chidx];
			result += jucode[juidx];
			if (joidx===0) continue;
			result += jocode[joidx];
			continue;
		}
		result += ch;
	}
	return result;
}