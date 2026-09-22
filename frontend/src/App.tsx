import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import { useUIStore } from './store/ui.store'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RoleGuard } from './components/auth/RoleGuard'

/* Routes are split per page: the login screen should not ship the kanban,
   the report charts and the CSV importer before anyone has signed in. */
const PublicBookingPage = lazy(() => import('./pages/PublicBookingPage'))
const PublicQuotePage = lazy(() => import('./pages/PublicQuotePage'))
const SuperAdminLayout = lazy(() => import('./pages/super-admin/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })))
const SuperAdminAgenciesPage = lazy(() => import('./pages/super-admin/SuperAdminAgenciesPage').then(m => ({ default: m.SuperAdminAgenciesPage })))
const SuperAdminAgencyDetailPage = lazy(() => import('./pages/super-admin/SuperAdminAgencyDetailPage').then(m => ({ default: m.SuperAdminAgencyDetailPage })))
const ProjetosPage = lazy(() => import('./pages/ProjetosPage').then(m => ({ default: m.ProjetosPage })))
const LeadsPage = lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })))
const HojePage = lazy(() => import('./pages/HojePage').then(m => ({ default: m.HojePage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ContactsPage = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })))
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })))
const PipelinePage = lazy(() => import('./pages/PipelinePage').then(m => ({ default: m.PipelinePage })))
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const CalendarSettingsPage = lazy(() => import('./pages/CalendarSettingsPage').then(m => ({ default: m.CalendarSettingsPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })))
const ConversationsPage = lazy(() => import('./pages/ConversationsPage').then(m => ({ default: m.ConversationsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const AutomationsPage = lazy(() => import('./pages/AutomationsPage').then(m => ({ default: m.AutomationsPage })))
const SnapshotsPage = lazy(() => import('./pages/SnapshotsPage').then(m => ({ default: m.SnapshotsPage })))
const PhoneNumbersPage = lazy(() => import('./pages/PhoneNumbersPage').then(m => ({ default: m.PhoneNumbersPage })))
const CallsPage = lazy(() => import('./pages/CallsPage').then(m => ({ default: m.CallsPage })))
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })))
const CampaignsPage = lazy(() => import('./pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
const FormsPage = lazy(() => import('./pages/FormsPage').then(m => ({ default: m.FormsPage })))
const AgencyPage = lazy(() => import('./pages/AgencyPage').then(m => ({ default: m.AgencyPage })))
const AgencyUsersPage = lazy(() => import('./pages/agency/AgencyUsersPage').then(m => ({ default: m.AgencyUsersPage })))
const AgencySettingsPage = lazy(() => import('./pages/agency/AgencySettingsPage').then(m => ({ default: m.AgencySettingsPage })))
const ActivityPage = lazy(() => import('./pages/agency/ActivityPage').then(m => ({ default: m.ActivityPage })))
const PipelineSettingsPage = lazy(() => import('./pages/agency/PipelineSettingsPage').then(m => ({ default: m.PipelineSettingsPage })))
const TeamPage = lazy(() => import('./pages/settings/TeamPage').then(m => ({ default: m.TeamPage })))
const GeneralSettingsPage = lazy(() => import('./pages/settings/GeneralSettingsPage').then(m => ({ default: m.GeneralSettingsPage })))
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage').then(m => ({ default: m.InviteAcceptPage })))
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage').then(m => ({ default: m.ForbiddenPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))


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
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/book/:userId" element={<PublicBookingPage />} />
      {/* Public proposal: no session, the token in the URL is the authorisation. */}
      <Route path="/proposta/:token" element={<PublicQuotePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        {/* /hoje is the landing screen: the day's work, not a wall of KPIs. */}
        <Route index element={<Navigate to="/hoje" replace />} />
        <Route path="hoje" element={<HojePage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="projetos" element={<ProjetosPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactDetailPage />} />
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
        <Route path="phone-numbers" element={<Navigate to="/settings" replace />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="agency" element={<AgencyPage />} />
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
          <ProtectedRoute allowedRoles={['AGENCY_OWNER', 'AGENCY_ADMIN']}>
            <GeneralSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/super-admin"
        element={
          <ProtectedRoute>
            <RoleGuard roles={['SUPER_ADMIN']}>
              <SuperAdminLayout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/super-admin/agencies" replace />} />
        <Route path="agencies" element={<SuperAdminAgenciesPage />} />
        <Route path="agencies/:id" element={<SuperAdminAgencyDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  )
}

export default App

/** Shown while a route chunk loads. Deliberately quiet: a spinner that flashes
 *  for 80ms reads as jank, an empty tinted panel does not. */
function RouteFallback() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{ padding: 24, minHeight: 200, background: 'var(--surface-2)' }}
    />
  )
}
