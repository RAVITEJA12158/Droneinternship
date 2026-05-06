import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { COOKIE_NAME, COOKIE_OPTIONS } from "../config/jwt";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await authService.registerUser(req.body);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS).status(201).json({ user });
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS).json({ user });
  } catch (err) { next(err); }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME).json({ message: "Logged out" });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUserById(req.user!.id);
    res.json({ user });
  } catch (err) { next(err); }
}
