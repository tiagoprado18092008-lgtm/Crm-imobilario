import api from './client';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  pipelineId: string;
}

export interface Pipeline {
  id: string;
  name: string;
  position: number;
  stages: PipelineStage[];
  _count?: { opportunities: number };
}

export const getPipelines = () => api.get<Pipeline[]>('/pipelines');

export const createPipeline = (name: string) =>
  api.post<Pipeline>('/pipelines', { name });

export const updatePipeline = (id: string, data: { name?: string; position?: number }) =>
  api.put<Pipeline>(`/pipelines/${id}`, data);

export const deletePipeline = (id: string) =>
  api.delete(`/pipelines/${id}`);

export const createStage = (pipelineId: string, data: { name: string; color?: string }) =>
  api.post<PipelineStage>(`/pipelines/${pipelineId}/stages`, data);

export const updateStage = (
  pipelineId: string,
  stageId: string,
  data: { name?: string; color?: string; position?: number }
) => api.put<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}`, data);

export const deleteStage = (pipelineId: string, stageId: string) =>
  api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
