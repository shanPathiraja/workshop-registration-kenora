import { useState } from 'react'
import {
  Alert,
  Badge,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { listAuditLogs } from '../api/audit'
import { ApiError } from '../api/client'
import { listUsers } from '../api/users'
import { useAuth } from '../hooks/useAuth'
import type { AuditEntityType, AuditLog, Role } from '../types'

const PAGE_SIZE = 25

/** Mirrors the backend: admins see account changes, managers see workshops and registrations. */
const VISIBLE_TYPES: Record<Role, AuditEntityType[]> = {
  admin: ['USER'],
  manager: ['WORKSHOP', 'REGISTRATION'],
  staff: [],
}

const TYPE_LABELS: Record<AuditEntityType, string> = {
  USER: 'Account',
  WORKSHOP: 'Workshop',
  REGISTRATION: 'Registration',
}

const FIELD_LABELS: Record<string, string> = {
  isActive: 'Status',
  attendeeName: 'Attendee',
  attendeeEmail: 'Email',
  startsAt: 'Starts',
  endsAt: 'Ends',
  cancelReason: 'Reason',
}

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'green',
  DEACTIVATED: 'red',
  CANCELLED: 'red',
  REACTIVATED: 'teal',
  ROLE_CHANGED: 'violet',
  PASSWORD_RESET: 'orange',
}

/** "USER_ROLE_CHANGED" → "Role changed" */
function actionLabel(action: string, type: AuditEntityType): string {
  const rest = action.startsWith(`${type}_`) ? action.slice(type.length + 1) : action
  const text = rest.toLowerCase().replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function actionColor(action: string): string {
  const match = Object.keys(ACTION_COLORS).find((key) => action.endsWith(key))
  return match ? ACTION_COLORS[match] : 'blue'
}

function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  const spaced = field.replace(/([A-Z])/g, ' $1').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'isActive') return value ? 'Active' : 'Inactive'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return dayjs(value).format('D MMM YYYY, HH:mm')
  }
  return String(value)
}

/** Best human-readable name for the changed record. */
function entityLabel(log: AuditLog, userNames: Map<string, string>): string {
  const known = userNames.get(log.entityId)
  if (known) return known
  const c = log.changes ?? {}
  for (const key of ['name', 'code', 'title', 'attendeeName']) {
    const value = c[key]?.to ?? c[key]?.from
    if (typeof value === 'string' && value) return value
  }
  return `#${log.entityId.slice(0, 8)}`
}

function Changes({ log }: { log: AuditLog }) {
  const entries = Object.entries(log.changes ?? {})
  if (entries.length === 0) return <Text c="dimmed" size="sm">—</Text>
  const isCreate = log.action.endsWith('CREATED')
  return (
    <Stack gap={2}>
      {entries.map(([field, { from, to }]) => (
        <Text key={field} size="sm">
          <Text span fw={500}>
            {fieldLabel(field)}:
          </Text>{' '}
          {field === 'password' ? (
            'changed'
          ) : isCreate ? (
            formatValue(field, to)
          ) : (
            <>
              <Text span c="dimmed" td="line-through">
                {formatValue(field, from)}
              </Text>{' '}
              → {formatValue(field, to)}
            </>
          )}
        </Text>
      ))}
    </Stack>
  )
}

export function ActivityPage() {
  const { user } = useAuth()
  const role = user?.role ?? 'staff'
  const types = VISIBLE_TYPES[role]
  const [entityType, setEntityType] = useState<AuditEntityType | null>(null)
  const [page, setPage] = useState(1)

  const logs = useQuery({
    queryKey: ['audit', { entityType, page }],
    queryFn: () =>
      listAuditLogs({ entityType: entityType ?? undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  })

  // Account entries only carry the user id; admins can resolve it to a name.
  const users = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: role === 'admin',
  })
  const userNames = new Map((users.data ?? []).map((u) => [u.id, u.name]))

  const totalPages = Math.max(1, Math.ceil((logs.data?.total ?? 0) / PAGE_SIZE))
  const rows = logs.data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Activity</Title>
          <Text c="dimmed" size="sm">
            {role === 'admin'
              ? 'Every account change: who made it and when.'
              : 'Every workshop and registration change: who made it and when.'}
          </Text>
        </div>
        {types.length > 1 && (
          <Select
            placeholder="All changes"
            clearable
            data={types.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            value={entityType}
            onChange={(value) => {
              setEntityType(value as AuditEntityType | null)
              setPage(1)
            }}
            className="w-48"
          />
        )}
      </Group>

      {logs.isError && (
        <Alert color="red">
          {logs.error instanceof ApiError ? logs.error.message : 'Could not load activity'}
        </Alert>
      )}

      <Paper withBorder radius="md">
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th className="w-44">When</Table.Th>
                <Table.Th>Who</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Record</Table.Th>
                <Table.Th>Changes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.isPending && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Group justify="center" p="md">
                      <Loader size="sm" />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )}
              {!logs.isPending && rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" p="md">
                      No activity yet
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {rows.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Text size="sm">{dayjs(log.createdAt).format('D MMM YYYY, HH:mm')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{log.actor?.name ?? 'System'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={actionColor(log.action)}>
                      {actionLabel(log.action, log.entityType)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {entityLabel(log, userNames)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {TYPE_LABELS[log.entityType]}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Changes log={log} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Group>
      )}
    </div>
  )
}
