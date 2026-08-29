let logReplace: ((message: string) => void) | null = null;

function log(message: string) {
	if (typeof logReplace === "function") logReplace(message);
	else console.log(message);
}
export default log;

export function replaceLog(newLog: (message: string) => void) {
	logReplace = newLog;
}
