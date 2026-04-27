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
