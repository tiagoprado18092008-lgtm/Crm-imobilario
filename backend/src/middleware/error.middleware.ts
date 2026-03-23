import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? 'Internal Server Error';

  console.error(`[ERROR] ${status} - ${message}`);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  res.status(status).json({
    error: message,
    status,
  });
};
