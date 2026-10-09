import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ApiError } from '../api/client'
import { deactivateUser, listUsers, updateUser } from '../api/users'
import { UserFormModal } from '../components/UserFormModal'
import { useAuth } from '../hooks/useAuth'
import type { Role, User } from '../types'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'grape',
  manager: 'blue',
  staff: 'teal',
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const users = useQuery({ queryKey: ['users'], queryFn: listUsers })

  const toggleActive = useMutation({
    mutationFn: async (user: User) => {
      if (user.isActive) await deactivateUser(user.id)
      else await updateUser(user.id, { isActive: true })
    },
    onSuccess: (_data, user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      notifications.show({
        color: 'green',
        message: `${user.name} has been ${user.isActive ? 'deactivated' : 'reactivated'}`,
      })
    },
    onError: (e) => {
      notifications.show({
        color: 'red',
        message: e instanceof ApiError ? e.message : 'Could not update the account',
      })
    },
  })

  const confirmToggle = (user: User) => {
    if (!user.isActive) {
      toggleActive.mutate(user)
      return
    }
    modals.openConfirmModal({
      title: 'Deactivate account?',
      centered: true,
      children: (
        <Text size="sm">
          {user.name} will be signed out and won't be able to sign in. Their past registrations stay
          in the history. You can reactivate the account at any time.
        </Text>
      ),
      labels: { confirm: 'Deactivate', cancel: 'Keep active' },
      confirmProps: { color: 'red' },
      onConfirm: () => toggleActive.mutate(user),
    })
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setFormOpen(true)
  }

  if (!currentUser) return null

  const term = search.trim().toLowerCase()
  const rows = (users.data ?? []).filter(
    (u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
  )

  return (
    <div className="flex flex-col gap-4">
      <Group justify="space-between">
        <div>
          <Title order={2}>Users</Title>
          <Text c="dimmed" size="sm">
            Staff accounts and their roles. There is no public sign-up; create accounts here.
          </Text>
        </div>
        <Button onClick={openCreate}>New user</Button>
      </Group>

      <TextInput
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        className="max-w-sm"
      />

      {users.isError && (
        <Alert color="red">
          {users.error instanceof ApiError ? users.error.message : 'Could not load users'}
        </Alert>
      )}

      <Paper withBorder radius="md">
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.isPending && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Group justify="center" p="md">
                      <Loader size="sm" />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )}
              {!users.isPending && rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" p="md">
                      {term ? 'No users match your search' : 'No users yet'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {rows.map((u) => {
                const isSelf = u.id === currentUser.id
                return (
                  <Table.Tr key={u.id} className={u.isActive ? undefined : 'opacity-60'}>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {u.name}
                        {isSelf && (
                          <Text span c="dimmed" size="xs" ml={6}>
                            (you)
                          </Text>
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{u.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={ROLE_COLORS[u.role]} variant="light" tt="capitalize">
                        {u.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={u.isActive ? 'green' : 'gray'} variant="dot">
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{dayjs(u.createdAt).format('D MMM YYYY')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button size="xs" variant="default" onClick={() => openEdit(u)}>
                          Edit
                        </Button>
                        {!isSelf && (
                          <Button
                            size="xs"
                            variant="subtle"
                            color={u.isActive ? 'red' : 'green'}
                            loading={toggleActive.isPending && toggleActive.variables?.id === u.id}
                            onClick={() => confirmToggle(u)}
                          >
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {formOpen && (
        <UserFormModal
          opened
          onClose={() => setFormOpen(false)}
          user={editing}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  )
}
