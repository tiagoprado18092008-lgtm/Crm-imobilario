import { Request, Response, NextFunction } from 'express';
import * as propertiesService from './properties.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      type: req.query.type as string,
      status: req.query.status as string,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const result = await propertiesService.list(filters, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await propertiesService.create(req.body, req.user);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await propertiesService.getById(req.params.id, req.user);
    res.status(200).json(property);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await propertiesService.update(req.params.id, req.body, req.user);
    res.status(200).json(property);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.remove(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── PHOTOS ──────────────────────────────────────────────────────────────────

export const addPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) { res.status(400).json({ error: 'Ficheiro obrigatório' }); return; }
    const url = `/uploads/properties/${req.params.id}/${file.filename}`;
    const photo = await propertiesService.addPhoto(req.params.id, url, req.body.categoria);
    res.status(201).json(photo);
  } catch (err) { next(err); }
};

export const reorderPhotos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.reorderPhotos(req.params.id, req.body.order);
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

export const updatePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.updatePhoto(req.params.id, req.params.photoId, req.body.categoria);
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

export const deletePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.deletePhoto(req.params.id, req.params.photoId);
    res.status(204).send();
  } catch (err) { next(err); }
};

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export const addDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) { res.status(400).json({ error: 'Ficheiro obrigatório' }); return; }
    const url = `/uploads/properties/${req.params.id}/${file.filename}`;
    const doc = await propertiesService.addDocument(
      req.params.id,
      req.body.nome || file.originalname,
      url,
      req.body.tipo,
      file.size
    );
    res.status(201).json(doc);
  } catch (err) { next(err); }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.deleteDocument(req.params.id, req.params.docId);
    res.status(204).send();
  } catch (err) { next(err); }
};

// ─── VISITS ──────────────────────────────────────────────────────────────────

export const getVisits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const visits = await propertiesService.getVisits(req.params.id, req.user);
    res.status(200).json(visits);
  } catch (err) { next(err); }
};

export const addVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const visit = await propertiesService.addVisit(req.params.id, req.body, req.user);
    res.status(201).json(visit);
  } catch (err) { next(err); }
};

export const updateVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.updateVisit(req.params.id, req.params.visitId, req.body, req.user);
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

// ─── GENERATE DESCRIPTION ────────────────────────────────────────────────────

export const generateDescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prop = await propertiesService.getById(req.params.id, req.user);

    const features = [
      `Tipo: ${prop.type}`,
      (prop as any).tipologia ? `Tipologia: ${(prop as any).tipologia}` : null,
      prop.area ? `Área bruta: ${prop.area} m²` : null,
      (prop as any).areaUtil ? `Área útil: ${(prop as any).areaUtil} m²` : null,
      prop.bedrooms != null ? `Quartos: ${prop.bedrooms}` : null,
      prop.bathrooms != null ? `Casas de banho: ${prop.bathrooms}` : null,
      prop.parking != null ? `Estacionamento: ${prop.parking} lugar(es)` : null,
      (prop as any).anoConstrucao ? `Ano de construção: ${(prop as any).anoConstrucao}` : null,
      (prop as any).piso != null ? `Piso: ${(prop as any).piso}` : null,
      (prop as any).orientacao ? `Orientação: ${(prop as any).orientacao}` : null,
      prop.energyCertificate ? `Certificado energético: ${prop.energyCertificate}` : null,
      prop.address ? `Localização: ${prop.address}` : null,
      (prop as any).comodidades?.length ? `Comodidades: ${(prop as any).comodidades.join(', ')}` : null,
    ].filter(Boolean).join('; ');

    const prompt = `Escreve uma descrição profissional e apelativa para anúncio imobiliário em PT-PT para: ${features}`;

    let description = '';

    if (process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      description = completion.choices[0]?.message?.content ?? '';
    } else {
      description = `Excelente ${prop.type.toLowerCase()} ${(prop as any).tipologia ?? ''} localizado em ${prop.address}. ${prop.area ? `Com ${prop.area} m² de área bruta` : ''}${prop.bedrooms != null ? `, ${prop.bedrooms} quartos` : ''}${prop.bathrooms != null ? ` e ${prop.bathrooms} casa(s) de banho` : ''}. Imóvel em excelente estado, ideal para quem procura conforto e qualidade.`;
    }

    res.status(200).json({ description });
  } catch (err) { next(err); }
};
