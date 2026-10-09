import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useDebouncedValue } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ApiError } from '../api/client'
import { cancelWorkshop, listWorkshops } from '../api/workshops'
import { WorkshopFormModal } from '../components/WorkshopFormModal'
import { useAuth } from '../hooks/useAuth'
import { WORKSHOP_STATUSES, type Workshop, type WorkshopStatus } from '../types'

const PAGE_SIZE = 25
const DAY = 'YYYY-MM-DD'

const STATUS_COLORS: Record<WorkshopStatus, string> = {
  SCHEDULED: 'blue',
  CANCELLED: 'red',
  COMPLETED: 'gray',
}

// Mantine clips badge labels; sub-pixel widths were cutting off the last letter.
const BADGE_STYLES = { label: { overflow: 'visible' } } as const

const statusLabel = (s: WorkshopStatus) => s.charAt(0) + s.slice(1).toLowerCase()

/** "Sat 11 Oct, 10:00–12:00" (adds the end date when it spans days). */
function formatWhen(w: Workshop): string {
  const start = dayjs(w.startsAt)
  const end = dayjs(w.endsAt)
  const endFmt = start.isSame(end, 'day') ? 'HH:mm' : 'ddd D MMM, HH:mm'
  return `${start.format('ddd D MMM YYYY, HH:mm')}–${end.format(endFmt)}`
}

function SeatsBadge({ w }: { w: Workshop }) {
  if (w.seatsLeft === 0) return <Badge color="red" styles={BADGE_STYLES}>Full</Badge>
  const color = w.seatsLeft <= Math.max(2, Math.ceil(w.capacity * 0.15)) ? 'orange' : 'green'
  return (
    <Badge color={color} variant="light" styles={BADGE_STYLES}>
      {w.seatsLeft} / {w.capacity} left
    </Badge>
  )
}

/** Monday-to-Sunday week containing today. */
function thisWeek(): [string, string] {
  const today = dayjs()
  const monday = today.subtract((today.day() + 6) % 7, 'day')
  return [monday.format(DAY), monday.add(6, 'day').format(DAY)]
}

export function WorkshopsPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'manager'
  const queryClient = useQueryClient()
  // Filters live in the URL, so "this week with seats" survives a refresh and can be bookmarked.
  const [params, setParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Workshop | null>(null)

  const search = params.get('search') ?? ''
  const status = (params.get('status') as WorkshopStatus | null) ?? null
  const hasSeats = params.get('hasSeats') === 'true'
  const from = params.get('from')
  const to = params.get('to')
  const page = Number(params.get('page') ?? '1') || 1
  const [debouncedSearch] = useDebouncedValue(search, 300)

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  const filters = {
    search: debouncedSearch.trim() || undefined,
    status: status ?? undefined,
    hasSeats: hasSeats || undefined,
    from: from ? dayjs(from).startOf('day').toISOString() : undefined,
    to: to ? dayjs(to).endOf('day').toISOString() : undefined,
    page,
    pageSize: PAGE_SIZE,
  }

  const workshops = useQuery({
    queryKey: ['workshops', filters],
    queryFn: () => listWorkshops(filters),
    placeholderData: keepPreviousData,
    // Seat counts change while the front desk is busy; keep them fresh.
    refetchInterval: 30_000,
  })

  const cancel = useMutation({
    mutationFn: (w: Workshop) => cancelWorkshop(w.id),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] })
      notifications.show({ color: 'green', message: `${saved.code} has been cancelled` })
    },
    onError: (e) => {
      notifications.show({
        color: 'red',
        message: e instanceof ApiError ? e.message : 'Could not cancel the workshop',
      })
    },
  })

  const confirmCancel = (w: Workshop) =>
    modals.openConfirmModal({
      title: `Cancel ${w.code}?`,
      centered: true,
      children: (
        <Text size="sm">
          “{w.title}” will be marked as cancelled and no new registrations will be accepted.
          {w.activeCount > 0 && ` ${w.activeCount} people are registered; their records are kept.`}
        </Text>
      ),
      labels: { confirm: 'Cancel workshop', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: () => cancel.mutate(w),
    })

  const openForm = (w: Workshop | null) => {
    setEditing(w)
    setFormOpen(true)
  }

  const rows = workshops.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil((workshops.data?.total ?? 0) / PAGE_SIZE))
  const hasFilters = Boolean(search || status || hasSeats || from || to)
  const [weekFrom, weekTo] = thisWeek()
  const isThisWeek = from === weekFrom && to === weekTo
  const colSpan = isManager ? 8 : 7

  return (
    <div className="flex flex-col gap-4">
      <Group justify="space-between">
        <div>
          <Title order={2}>Workshops</Title>
          <Text c="dimmed" size="sm">
            {isManager ? 'Schedule and edit workshops.' : 'Find workshops and check seats.'}
          </Text>
        </div>
        {isManager && <Button onClick={() => openForm(null)}>New workshop</Button>}
      </Group>

      <Paper withBorder radius="md" p="sm">
        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            label="Search"
            placeholder="Code, title or instructor"
            value={search}
            onChange={(e) => update({ search: e.currentTarget.value })}
            className="w-64"
          />
          <DatePickerInput
            type="range"
            label="Dates"
            placeholder="Any date"
            clearable
            allowSingleDateInRange
            valueFormat="D MMM YYYY"
            value={[from, to]}
            onChange={([start, end]) => update({ from: start, to: end })}
            className="w-64"
          />
          <Button
            variant={isThisWeek ? 'filled' : 'light'}
            onClick={() => update(isThisWeek ? { from: null, to: null } : { from: weekFrom, to: weekTo })}
          >
            This week
          </Button>
          <Select
            label="Status"
            placeholder="Any status"
            clearable
            data={WORKSHOP_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
            value={status}
            onChange={(value) => update({ status: value })}
            className="w-40"
          />
          <Switch
            label="Only with seats available"
            checked={hasSeats}
            onChange={(e) => update({ hasSeats: e.currentTarget.checked ? 'true' : null })}
            className="pb-2"
          />
          {hasFilters && (
            <Button variant="subtle" color="gray" onClick={() => setParams({}, { replace: true })}>
              Clear filters
            </Button>
          )}
        </Group>
      </Paper>

      {workshops.isError && (
        <Alert color="red">
          {workshops.error instanceof ApiError ? workshops.error.message : 'Could not load workshops'}
        </Alert>
      )}

      <Paper withBorder radius="md">
        <Table.ScrollContainer minWidth={1080}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Instructor</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>When</Table.Th>
                <Table.Th>Seats</Table.Th>
                <Table.Th>Status</Table.Th>
                {isManager && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {workshops.isPending && (
                <Table.Tr>
                  <Table.Td colSpan={colSpan}>
                    <Group justify="center" p="md">
                      <Loader size="sm" />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )}
              {!workshops.isPending && rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={colSpan}>
                    <Text c="dimmed" ta="center" p="md">
                      {hasFilters ? 'No workshops match these filters' : 'No workshops yet'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {rows.map((w) => (
                <Table.Tr key={w.id} className={w.status === 'SCHEDULED' ? undefined : 'opacity-60'}>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600} className="whitespace-nowrap">
                      {w.code}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {w.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{w.instructor}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{w.location}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatWhen(w)}</Text>
                  </Table.Td>
                  <Table.Td className="whitespace-nowrap">
                    <SeatsBadge w={w} />
                  </Table.Td>
                  <Table.Td className="whitespace-nowrap">
                    <Badge color={STATUS_COLORS[w.status]} variant="dot" styles={BADGE_STYLES}>
                      {statusLabel(w.status)}
                    </Badge>
                  </Table.Td>
                  {isManager && (
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button size="xs" variant="default" onClick={() => openForm(w)}>
                          Edit
                        </Button>
                        {w.status === 'SCHEDULED' && (
                          <Button
                            size="xs"
                            variant="subtle"
                            color="red"
                            loading={cancel.isPending && cancel.variables?.id === w.id}
                            onClick={() => confirmCancel(w)}
                          >
                            Cancel
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination value={page} onChange={(p) => update({ page: String(p) })} total={totalPages} />
        </Group>
      )}

      {formOpen && <WorkshopFormModal workshop={editing} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
