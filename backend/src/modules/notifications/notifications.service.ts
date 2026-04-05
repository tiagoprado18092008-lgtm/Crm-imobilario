import { Response } from 'express';

interface SSEClient {
  userId: string;
  res: Response;
}

const clients: SSEClient[] = [];

export const addClient = (userId: string, res: Response) => {
  clients.push({ userId, res });
};

export const removeClient = (res: Response) => {
  const idx = clients.findIndex(c => c.res === res);
  if (idx !== -1) clients.splice(idx, 1);
};

export const sendToUser = (userId: string, event: string, data: object) => {
  clients
    .filter(c => c.userId === userId)
    .forEach(c => {
      try {
        c.res.write(`event: ${event}\n`);
        c.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        removeClient(c.res);
      }
    });
};

export const broadcast = (event: string, data: object) => {
  clients.forEach(c => {
    try {
      c.res.write(`event: ${event}\n`);
      c.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      removeClient(c.res);
    }
  });
};
