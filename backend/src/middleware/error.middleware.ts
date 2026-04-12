import { Request, Response, NextFunction } from 'express';

// Map Prisma error codes to HTTP responses
function handlePrismaError(err: any): { status: number; message: string } | null {
  const code = err?.code;
  if (!code) return null;
  switch (code) {
    case 'P2002': {
      const fields = err.meta?.target?.join(', ') ?? 'campo';
      return { status: 409, message: `Já existe um registo com esse ${fields}` };
    }
    case 'P2025':
      return { status: 404, message: err.meta?.cause ?? 'Registo não encontrado' };
    case 'P2003': {
      const field = err.meta?.field_name ?? 'referência';
      return { status: 400, message: `Referência inválida: ${field}` };
    }
    case 'P2014':
      return { status: 400, message: 'Violação de relação obrigatória' };
    default:
      return null;
  }
}

export const errorMiddleware = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const prisma = handlePrismaError(err);
  if (prisma) {
    res.status(prisma.status).json({ error: prisma.message, status: prisma.status });
    return;
  }

  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? 'Erro interno do servidor';

  if (status >= 500) {
    console.error(`[ERROR] ${status} - ${message}`);
    if (process.env.NODE_ENV === 'development' && err.stack) {
      console.error(err.stack);
    }
  }

  res.status(status).json({ error: message, status });
};
