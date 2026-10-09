import { Link, NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell, Badge, Button, Group, NavLink, Text, Title } from '@mantine/core'
import { navItemsFor } from '../auth/navigation'
import { useAuth } from '../hooks/useAuth'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (!user) return null

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" className="shadow-sm">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Title order={3}>Kenora Workshops</Title>
          </Link>
          <Group gap="sm">
            <Text size="sm">{user.name}</Text>
            <Badge variant="light" tt="capitalize">
              {user.role}
            </Badge>
            <Button variant="default" size="xs" onClick={handleSignOut}>
              Sign out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {navItemsFor(user.role).map((item) => (
          <NavLink
            key={item.to}
            component={RouterNavLink}
            to={item.to}
            label={item.label}
            active={pathname.startsWith(item.to)}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
