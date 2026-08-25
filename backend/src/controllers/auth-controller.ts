import { Request, Response } from "express";
import { register as registerService, login as loginService } from "../services/auth";
import { registerSchema, loginSchema } from "../validation/auth";

export async function handleRegister(req: Request, res: Response) {
    try {
        const {error} = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({message: error.details[0].message});
        }

        const {full_name, username, email, password} =  req.body;
        
        const user = await registerService(full_name, username,  email, password);
        return res.status(201).json({message: "User registered successfully", user});

    } catch (err) {
        return res.status(500).json({message: "Internal server error"});
    }
}

export async function handleLogin(req: Request, res: Response) {
  try {
    const { identifier, password } = req.body;

    const { token } = await loginService(identifier, password);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    return res.status(200).json({
      message: "Login success",
    });
  } catch (err: any) {
    return res.status(401).json({
      message: err.message || "Invalid credentials",
    });
  }
}

export function handleLogout(req: Request, res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({ message: "Logout success" });
}


