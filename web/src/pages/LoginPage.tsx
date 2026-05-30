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
    } catch (e: any) {
      if (e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED') {
        setError('サーバーに接続できません。しばらく待ってから再試行してください。')
      } else if (e.response?.status === 401) {
        setError('ユーザー名またはパスワードが間違っています')
      } else {
        setError('ログインに失敗しました。サーバーが起動しているか確認してください。')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">llmn</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">ユーザー名</label>
          <input
            id="username"
            className="w-full border rounded px-3 py-2 text-sm"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">パスワード</label>
          <input
            id="password"
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
