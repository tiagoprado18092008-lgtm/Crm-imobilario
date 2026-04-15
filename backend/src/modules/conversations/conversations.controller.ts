import { Request, Response, NextFunction } from 'express';
import * as conversationsService from './conversations.service';

export const listConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel, status, contactId, assignedToId, page, limit } = req.query as Record<string, string>;
    const result = await conversationsService.list(
      {
        channel,
        status,
        contactId,
        assignedToId,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      req.user
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel, externalId, contactId } = req.body;
    if (!channel || !externalId) {
      res.status(400).json({ error: 'channel and externalId are required', status: 400 });
      return;
    }
    const conversation = await conversationsService.createOrFind(
      channel,
      externalId,
      contactId,
      req.user.id
    );
    res.status(201).json(conversation);
  } catch (err) {
    next(err);
  }
};

export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await conversationsService.getStats(req.user);
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
};

export const getConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversation = await conversationsService.getById(req.params.id, req.user);
    res.status(200).json(conversation);
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content, subject, channel } = req.body;
    if (!content) {
      res.status(400).json({ error: 'content is required', status: 400 });
      return;
    }

    // Retrieve conversation to resolve channel if not provided
    const conversation = await conversationsService.getById(req.params.id, req.user);
    const resolvedChannel = channel || conversation.channel;

    const result = await conversationsService.sendMessage(
      req.params.id,
      content,
      resolvedChannel,
      req.user.id,
      subject
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status is required', status: 400 });
      return;
    }
    const conversation = await conversationsService.updateStatus(req.params.id, status);
    res.status(200).json(conversation);
  } catch (err) {
    next(err);
  }
};

export const assignConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required', status: 400 });
      return;
    }
    const conversation = await conversationsService.assign(req.params.id, userId);
    res.status(200).json(conversation);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversation = await conversationsService.markAsRead(req.params.id, req.user);
    res.status(200).json(conversation);
  } catch (err) {
    next(err);
  }
};

export const toggleStar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversation = await conversationsService.toggleStar(req.params.id, req.user);
    res.status(200).json(conversation);
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await conversationsService.getUnreadCount(req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
