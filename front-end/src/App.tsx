import { Text } from '@mantine/core'
import { Navigate, Route, Routes } from 'react-router-dom'
import { landingPath } from './auth/landing'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'

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
          <Route path="*" element={<Text>Page not found</Text>} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
