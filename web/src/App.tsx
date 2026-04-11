import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { MonkeyProvider } from '@/contexts/MonkeyContext'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import SetupPage from '@/pages/SetupPage'
import QuestionsPage from '@/pages/QuestionsPage'
import QuestionSetsPage from '@/pages/QuestionSetsPage'
import QuestionSetDetailPage from '@/pages/QuestionSetDetailPage'
import AnswersPage from '@/pages/AnswersPage'
import ExecutionsPage from '@/pages/ExecutionsPage'
import JobsPage from '@/pages/JobsPage'
import LearningTextsPage from '@/pages/LearningTextsPage'
import ChatPage from '@/pages/ChatPage'
import JobLogPage from '@/pages/JobLogPage'

function AppRoutes() {
  const { loggedIn } = useAuth()

  if (!loggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <MonkeyProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/poc/:pocId/questions" element={<QuestionsPage />} />
          <Route path="/poc/:pocId/question-sets" element={<QuestionSetsPage />} />
          <Route path="/poc/:pocId/question-sets/:qsId" element={<QuestionSetDetailPage />} />
          <Route path="/poc/:pocId/question-sets/:qsId/answers" element={<AnswersPage />} />
          <Route path="/poc/:pocId/executions" element={<ExecutionsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/learning-texts" element={<LearningTextsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/jobs/:jobId/log" element={<JobLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
    </MonkeyProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
