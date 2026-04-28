import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY,
  },
})

export interface SearchResult {
  user: string
  symptom: string
  answer: string
  sources: {
    source: string
    heading: string
    distance: number
  }[]
}

export interface Facility {
  id: number
  name: string
  type: 'hospital' | 'pharmacy'
  address: string
  tel: string
  distance_km: number
  open: boolean
  hours: string
  specialties?: string[]
  has_pharmacist?: boolean
}

export const searchDrug = async (symptom: string): Promise<SearchResult> => {
  const res = await client.post('/api/search', { symptom })
  return res.data
}

export const getFacilities = async (type?: string): Promise<Facility[]> => {
  const res = await client.get('/api/facilities', { params: type ? { type } : {} })
  return res.data
}

export interface DatasetSource {
  source: string
  chunk_count: number
}

export const getSources = async (): Promise<DatasetSource[]> => {
  const res = await client.get('/api/dataset/sources')
  return res.data
}

export const deleteSource = async (source: string): Promise<void> => {
  await client.delete(`/api/dataset/sources/${encodeURIComponent(source)}`)
}

export const addWikipedia = async (title: string): Promise<{ message: string; chunk_count: number }> => {
  const res = await client.post('/api/dataset/sources/wikipedia', { title })
  return res.data
}

export const refreshSource = async (source: string): Promise<{ message: string; chunk_count: number }> => {
  const res = await client.post(`/api/dataset/sources/refresh/${encodeURIComponent(source)}`)
  return res.data
}

export interface Chunk {
  id: string
  heading: string
  index: number
  text: string
}

export const getChunks = async (source: string): Promise<Chunk[]> => {
  const res = await client.get(`/api/dataset/sources/${encodeURIComponent(source)}/chunks`)
  return res.data
}

export const updateChunk = async (chunkId: string, text: string): Promise<{ message: string }> => {
  const res = await client.put(`/api/dataset/chunks/${encodeURIComponent(chunkId)}`, { text })
  return res.data
}

export const deleteChunk = async (chunkId: string): Promise<void> => {
  await client.delete(`/api/dataset/chunks/${encodeURIComponent(chunkId)}`)
}

export const addText = async (source: string, text: string, separator: string = '@@@'): Promise<{ message: string; chunk_count: number }> => {
  const res = await client.post('/api/dataset/sources/text', { source, text, separator })
  return res.data
}

export interface Prompt {
  order: number
  file: string
  name: string
  content: string
}

export const getPrompts = async (): Promise<Prompt[]> => {
  const res = await client.get('/api/prompts')
  return res.data
}

export const addPrompt = async (name: string, content: string): Promise<{ message: string }> => {
  const res = await client.post('/api/prompts', { name, content })
  return res.data
}

export const updatePrompt = async (file: string, name: string, content: string): Promise<{ message: string }> => {
  const res = await client.put(`/api/prompts/${encodeURIComponent(file)}`, { name, content })
  return res.data
}

export const deletePrompt = async (file: string): Promise<{ message: string }> => {
  const res = await client.delete(`/api/prompts/${encodeURIComponent(file)}`)
  return res.data
}

export const reorderPrompts = async (orders: { file: string; order: number }[]): Promise<void> => {
  await client.post('/api/prompts/reorder', { orders })
}
