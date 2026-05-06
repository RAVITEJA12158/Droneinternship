import { Request, Response, NextFunction } from "express";
import { search } from "../services/search.service";
import { parsePagination } from "../lib/paginate";

export async function searchAll(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || "");
    const type = req.query.type as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    res.json(await search(req.user!.id, q, type, from, to, page, limit));
  } catch (err) { next(err); }
}
