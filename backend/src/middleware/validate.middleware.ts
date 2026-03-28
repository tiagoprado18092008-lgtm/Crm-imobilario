import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      res.status(400).json({ error: 'Dados inválidos', details: errors, status: 400 });
      return;
    }
    next(err);
  }
};

export const validateQuery = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.query = schema.parse(req.query) as any;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      res.status(400).json({ error: 'Parâmetros inválidos', details: errors, status: 400 });
      return;
    }
    next(err);
  }
};
