import jwt from "jsonwebtoken";


// mengambil jwt_secret dari env
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return secret;
})();

// data yang akan disimpan oleh jwt
export interface UserPayload {
  id: number;
  email: string;
  username: string;
}

// untuk mendapatkan jwt string dengan menerima data user
export function signToken(payload: UserPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

// memverifikasi apakah data user valid, jika valid return payload user
export function verifyToken(token: string): UserPayload {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
}
