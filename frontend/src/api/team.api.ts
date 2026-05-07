import api from './client'

export const listTeamMembers = () => api.get('/team/members')
export const updateMember = (id: string, data: object) => api.patch(`/team/members/${id}`, data)
export const deactivateMember = (id: string) => api.delete(`/team/members/${id}`)
