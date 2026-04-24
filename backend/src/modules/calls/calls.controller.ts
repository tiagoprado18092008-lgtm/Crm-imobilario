import { Request, Response } from 'express'
import * as callsService from './calls.service'

export const getToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await callsService.getCallToken(req.user!.id)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get call token' })
  }
}

export const initiate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, contactId, opportunityId, fromNumberId, browserCall, callSid } = req.body
    if (!to) {
      res.status(400).json({ error: 'Missing required field: to' })
      return
    }
    const result = await callsService.initiateCall({
      to,
      contactId,
      opportunityId,
      fromNumberId,
      userId: req.user!.id,
      browserCall: !!browserCall,
      callSid,
    })
    res.status(201).json(result)
  } catch (err: any) {
    res.status(err?.status || 500).json({ error: err.message || 'Failed to initiate call' })
  }
}

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const { contactId, page, limit } = req.query
    const result = await callsService.listCalls(req.user!.id, {
      contactId: contactId as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    })
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list calls' })
  }
}

export const updateNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { notes } = req.body
    if (!notes) {
      res.status(400).json({ error: 'Missing required field: notes' })
      return
    }
    const result = await callsService.updateCallNotes(id, notes, req.user!.id)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update call notes' })
  }
}
