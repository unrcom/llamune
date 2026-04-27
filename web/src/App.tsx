import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { searchDrug, getFacilities } from './api'
import type { SearchResult, Facility } from './api'

const Spinner = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1rem' }}>
    <div style={{
      width: 48, height: 48, border: '4px solid #e5e7eb',
      borderTop: '4px solid #2563eb', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>検索中です。しばらくお待ちください...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export default function App() {
  const [symptom, setSymptom] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!symptom.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setFacilities([])
    try {
      const [searchRes, facilityRes] = await Promise.all([
        searchDrug(symptom),
        getFacilities(),
      ])
      setResult(searchRes)
      setFacilities(facilityRes)
    } catch (e: any) {
      setError('エラーが発生しました。バックエンドの状態を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', color: '#111111' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#111111' }}>💊 llamune ハイブリッド検索</h1>

      <div style={{ marginBottom: '1rem' }}>
        <textarea
          value={symptom}
          onChange={e => setSymptom(e.target.value)}
          placeholder={'症状を入力してください（例：頭が痛くて熱っぽい）'}
          rows={3}
          style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: 6, border: '1px solid #ccc', resize: 'vertical', boxSizing: 'border-box', color: '#111111', backgroundColor: '#ffffff' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: 6, background: '#2563eb', color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          検索
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 6, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && <Spinner />}

      {result && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#111111' }}>💬 回答</h2>
          <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: 6, lineHeight: 1.8, color: '#111111', textAlign: 'left' }}>
            <ReactMarkdown>{result.answer}</ReactMarkdown>
          </div>
          <h3 style={{ marginTop: '1rem', color: '#111111' }}>📚 参照ソース</h3>
          <div style={{ paddingLeft: '0.5rem' }}>
            {result.sources.map((s, i) => (
              <div key={i} style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: '#374151' }}>
                {s.source} / {s.heading}
              </div>
            ))}
          </div>
        </div>
      )}

      {facilities.length > 0 && (
        <div>
          <h2 style={{ color: '#111111' }}>🏥 近隣の病院</h2>
          {facilities.filter(f => f.type === 'hospital').map(f => (
            <div key={f.id} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem', backgroundColor: '#ffffff' }}>
              <div>
                <strong style={{ color: '#111111' }}>{f.name}</strong>
                <span style={{ marginLeft: '0.5rem', color: f.open ? '#16a34a' : '#dc2626', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {f.open ? '営業中' : '営業時間外'}
                </span>
              </div>
              <div style={{ color: '#374151', fontSize: '0.85rem', marginTop: '0.25rem' }}>{f.address} · {f.distance_km}km · {f.hours}</div>
            </div>
          ))}

          <h2 style={{ color: '#111111' }}>💊 近隣の薬局</h2>
          {facilities.filter(f => f.type === 'pharmacy').map(f => (
            <div key={f.id} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem', backgroundColor: '#ffffff' }}>
              <div>
                <strong style={{ color: '#111111' }}>{f.name}</strong>
                <span style={{ marginLeft: '0.5rem', color: f.open ? '#16a34a' : '#dc2626', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {f.open ? '営業中' : '営業時間外'}
                </span>
              </div>
              <div style={{ color: '#374151', fontSize: '0.85rem', marginTop: '0.25rem' }}>{f.address} · {f.distance_km}km · {f.hours}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
