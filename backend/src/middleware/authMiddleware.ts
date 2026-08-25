import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"

export function authMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction) {

  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized (no cookie token)" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (e: any) {
    console.log("jwt.verify error =", e.message);
    return res.status(401).json({ message: "Invalid token", error: e.message });
  }
}


export interface AuthRequest extends Request {
  user?: {
    id: number;
  };
}
