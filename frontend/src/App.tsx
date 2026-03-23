import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { ContactsPage } from './pages/ContactsPage'
import { ContactDetailPage } from './pages/ContactDetailPage'
import { PropertiesPage } from './pages/PropertiesPage'
import { PropertyDetailPage } from './pages/PropertyDetailPage'
import { PipelinePage } from './pages/PipelinePage'
import { TasksPage } from './pages/TasksPage'
import { ReportsPage } from './pages/ReportsPage'
import { UsersPage } from './pages/UsersPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'

function App() {
  const { hydrate } = useAuthStore()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactDetailPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="calendar" element={<TasksPage initialTab="calendar" />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
