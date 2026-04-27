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
