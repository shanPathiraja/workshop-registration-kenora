import { Text, Title } from '@mantine/core'
import { Navigate, Route, Routes } from 'react-router-dom'
import { landingPath } from './auth/landing'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { UsersPage } from './pages/UsersPage'

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? landingPath(user.role) : '/login'} replace />
}

const Placeholder = ({ title }: { title: string }) => <Title order={2}>{title}</Title>

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
            <Route path="workshops" element={<Placeholder title="Workshops" />} />
          </Route>
          <Route element={<RequireRole roles={['admin', 'manager']} />}>
            <Route path="activity" element={<Placeholder title="Activity" />} />
          </Route>
          <Route path="*" element={<Text>Page not found</Text>} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
