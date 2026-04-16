import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import { useUIStore } from './store/ui.store'
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
import { CalendarPage } from './pages/CalendarPage'
import { CalendarSettingsPage } from './pages/CalendarSettingsPage'
import { ReportsPage } from './pages/ReportsPage'
import { UsersPage } from './pages/UsersPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { AutomationsPage } from './pages/AutomationsPage'
import { SnapshotsPage } from './pages/SnapshotsPage'
import { PhoneNumbersPage } from './pages/PhoneNumbersPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { CampaignsPage } from './pages/CampaignsPage'
import { FormsPage } from './pages/FormsPage'
import { AgencyPage } from './pages/AgencyPage'
import { LocationsPage } from './pages/agency/LocationsPage'
import { AgencyUsersPage } from './pages/agency/AgencyUsersPage'
import { AgencySettingsPage } from './pages/agency/AgencySettingsPage'
import { ActivityPage } from './pages/agency/ActivityPage'
import { PipelineSettingsPage } from './pages/agency/PipelineSettingsPage'
import { TeamPage } from './pages/settings/TeamPage'
import { GeneralSettingsPage } from './pages/settings/GeneralSettingsPage'
import { InviteAcceptPage } from './pages/InviteAcceptPage'
import { ForbiddenPage } from './pages/ForbiddenPage'

function App() {
  const { hydrate } = useAuthStore()
  const { crmName } = useUIStore()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    document.title = crmName
  }, [crmName])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

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
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="calendar/settings" element={<CalendarSettingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="automations" element={<AutomationsPage />} />
        <Route path="snapshots" element={<SnapshotsPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="phone-numbers" element={<PhoneNumbersPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="agency" element={<AgencyPage />} />
        <Route path="agency/locations" element={
          <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN']}>
            <LocationsPage />
          </ProtectedRoute>
        } />
        <Route path="agency/users" element={
          <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN']}>
            <AgencyUsersPage />
          </ProtectedRoute>
        } />
        <Route path="agency/settings" element={
          <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN']}>
            <AgencySettingsPage />
          </ProtectedRoute>
        } />
        <Route path="agency/activity" element={
          <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN']}>
            <ActivityPage />
          </ProtectedRoute>
        } />
        <Route path="agency/pipelines" element={
          <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN']}>
            <PipelineSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="settings/team" element={<TeamPage />} />
        <Route path="settings/general" element={
          <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN', 'LOCATION_ADMIN']}>
            <GeneralSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
