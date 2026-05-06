import { Request, Response, NextFunction } from "express";
import * as orthoService from "../services/orthomosaic.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await orthoService.listOrthomosaics(req.params.id, req.user!.id));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await orthoService.deleteOrthomosaic(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
}
