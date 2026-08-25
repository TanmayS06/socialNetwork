import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";
import { signToken } from "../utils/jwt";
import { Request, Response } from "express";

export async function register(full_name: string, username: string, email: string, password: string) {
  if (!email.match(/@/) || password.length < 6 ) {
    throw new Error("Invalid email/username or password");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      full_name,
      username,
      email,
      password: hashedPassword
    }
  });

  return user
}

export async function login(identifier: string, password: string) {
    // trim = membersihkan spasi yang tidak perlu
    identifier = identifier.trim().toLowerCase();
    
    const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
      ],
    },
  })


    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }

    const token = signToken({id:user.id, email: user.email, username: user.username});

    return {token};
}

export const MyProfile = async (req: any, res: Response) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      full_name: true,
      email: true,
      photo_profile: true,
      bio: true,
      created_at: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user });
};
