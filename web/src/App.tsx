import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getToken, getIsAdmin } from '@/api/client'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ModelsPage from '@/pages/ModelsPage'
import FtDataPage from '@/pages/FtDataPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />
  if (!getIsAdmin()) return <Navigate to="/chat" replace />
  return <>{children}</>
}

function ChatPage() {
  return <div className="p-6 text-gray-500">チャット（未実装）</div>
}

function DatasetPage() {
  return <div className="p-6 text-gray-500">データセット管理（未実装）</div>
}

function JobsPage() {
  return <div className="p-6 text-gray-500">訓練ジョブ（未実装）</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat"    element={<ChatPage />} />
          <Route path="/dataset" element={<DatasetPage />} />
          <Route path="/admin/projects" element={<RequireAdmin><ProjectsPage /></RequireAdmin>} />
          <Route path="/admin/models"   element={<RequireAdmin><ModelsPage /></RequireAdmin>} />
          <Route path="/admin/ft-data"  element={<RequireAdmin><FtDataPage /></RequireAdmin>} />
          <Route path="/admin/jobs"     element={<RequireAdmin><JobsPage /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
