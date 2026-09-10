import type { Request, Response, NextFunction } from "express";

export function cache(duration: number, isPrivate: boolean = false, isImmutable: boolean = false): <P>(
	req: Request<P>,
	res: Response,
	next: NextFunction
) => void {
	return (req, res, next) => {
		if (req.method === 'GET' || req.method === 'HEAD') {
        	res.setHeader('Cache-Control', `${isPrivate ? 'private' : 'public'}, max-age=${duration}${isImmutable ? ', immutable' : ''}`);
    	}
    	next();
	};
}
