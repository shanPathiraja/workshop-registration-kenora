import { Text } from '@mantine/core'
import { Navigate, Route, Routes } from 'react-router-dom'
import { landingPath } from './auth/landing'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { ActivityPage } from './pages/ActivityPage'
import { UsersPage } from './pages/UsersPage'
import { WorkshopDetailPage } from './pages/WorkshopDetailPage'
import { WorkshopsPage } from './pages/WorkshopsPage'

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? landingPath(user.role) : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route element={<RequireRole roles={['manager', 'staff']} />}>
            <Route path="workshops" element={<WorkshopsPage />} />
            <Route path="workshops/:id" element={<WorkshopDetailPage />} />
          </Route>
          <Route element={<RequireRole roles={['admin', 'manager']} />}>
            <Route path="activity" element={<ActivityPage />} />
          </Route>
          <Route path="*" element={<Text>Page not found</Text>} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
