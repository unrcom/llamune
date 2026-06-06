import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getToken, getIsAdmin } from '@/api/client'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ModelsPage from '@/pages/ModelsPage'
import FtDataPage from '@/pages/FtDataPage'
import JobsPage from '@/pages/JobsPage'
import ChatPage from '@/pages/ChatPage'
import DatasetPage from '@/pages/DatasetPage'
import LogsPage from '@/pages/LogsPage'

function RequireAuth({ children }: Readonly<{ children: React.ReactNode }>) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!getToken()) return <Navigate to="/login" replace />
  if (!getIsAdmin()) return <Navigate to="/chat" replace />
  return <>{children}</>
}



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/dataset" element={<DatasetPage />} />
          <Route path="/admin/projects" element={<RequireAdmin><ProjectsPage /></RequireAdmin>} />
          <Route path="/admin/models"   element={<RequireAdmin><ModelsPage /></RequireAdmin>} />
          <Route path="/admin/ft-data"  element={<RequireAdmin><FtDataPage /></RequireAdmin>} />
          <Route path="/admin/jobs"     element={<RequireAdmin><JobsPage /></RequireAdmin>} />
          <Route path="/admin/logs"     element={<RequireAdmin><LogsPage /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
