import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, setTokens } from '@/api/client'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin() {
    setError('')
    try {
      const form = new FormData()
      form.append('username', username)
      form.append('password', password)
      const res = await apiClient.post('/auth/login', form)
      setTokens(res.data.access_token, res.data.refresh_token)
      navigate('/')
    } catch {
      setError('ユーザー名またはパスワードが間違っています')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">llmn</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <label className="text-sm font-medium">ユーザー名</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">パスワード</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700"
        >
          ログイン
        </button>
      </div>
    </div>
  )
}
