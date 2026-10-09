import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { ApiError } from '../api/client'
import { cancelRegistration, listRegistrations, registerAttendee } from '../api/registrations'
import { getWorkshop } from '../api/workshops'
import type { Registration, Workshop } from '../types'

const registerSchema = z.object({
  attendeeName: z.string().trim().min(1, 'Name is required').max(200),
  attendeeEmail: z.email('Enter a valid email'),
})

const fmt = (iso: string) => dayjs(iso).format('D MMM YYYY, HH:mm')

function closedReason(w: Workshop): string | null {
  if (w.status === 'CANCELLED') return 'This workshop has been cancelled.'
  if (w.status === 'COMPLETED') return 'This workshop has finished.'
  if (dayjs(w.startsAt).isBefore(dayjs())) return 'This workshop has already started.'
  return null
}

export function WorkshopDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  // Keep seat counts fresh while the front desk is busy.
  const workshop = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => getWorkshop(id),
    refetchInterval: 15_000,
  })
  const registrations = useQuery({
    queryKey: ['registrations', id],
    queryFn: () => listRegistrations(id),
    refetchInterval: 15_000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['workshop', id] })
    queryClient.invalidateQueries({ queryKey: ['registrations', id] })
    queryClient.invalidateQueries({ queryKey: ['workshops'] })
  }

  const form = useForm({
    initialValues: { attendeeName: '', attendeeEmail: '' },
    validate: zodResolver(registerSchema),
  })

  const register = useMutation({
    mutationFn: (values: { attendeeName: string; attendeeEmail: string }) =>
      registerAttendee(id, {
        attendeeName: values.attendeeName.trim(),
        attendeeEmail: values.attendeeEmail.trim(),
      }),
    onSuccess: (r) => {
      notifications.show({ color: 'green', message: `${r.attendeeName} is registered` })
      form.reset()
      setFormError(null)
      refresh()
    },
    onError: (e) => {
      setFormError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
      // A 409 usually means someone else just took the last seat: show the real count.
      refresh()
    },
  })

  const cancel = useMutation({
    mutationFn: ({ registration, reason }: { registration: Registration; reason: string }) =>
      cancelRegistration(registration.id, reason.trim() || undefined),
    onSuccess: (r) => {
      notifications.show({ color: 'green', message: `${r.attendeeName}'s registration was cancelled` })
      refresh()
    },
    onError: (e) => {
      notifications.show({
        color: 'red',
        message: e instanceof ApiError ? e.message : 'Could not cancel the registration',
      })
      refresh()
    },
  })

  const confirmCancel = (registration: Registration) => {
    let reason = ''
    modals.openConfirmModal({
      title: `Cancel ${registration.attendeeName}'s registration?`,
      centered: true,
      children: (
        <Stack gap="sm">
          <Text size="sm">
            Their seat will be freed. The registration stays in the history.
          </Text>
          <Textarea
            label="Reason (optional)"
            placeholder="e.g. Called to cancel"
            autosize
            minRows={2}
            onChange={(e) => {
              reason = e.currentTarget.value
            }}
          />
        </Stack>
      ),
      labels: { confirm: 'Cancel registration', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: () => cancel.mutate({ registration, reason }),
    })
  }

  if (workshop.isPending) {
    return (
      <Group justify="center" p="xl">
        <Loader />
      </Group>
    )
  }
  if (workshop.isError) {
    return (
      <Alert color="red">
        {workshop.error instanceof ApiError ? workshop.error.message : 'Could not load the workshop'}
      </Alert>
    )
  }

  const w = workshop.data
  const closed = closedReason(w)
  const full = w.seatsLeft === 0
  const all = registrations.data?.items ?? []
  const active = all.filter((r) => r.status === 'ACTIVE')
  const cancelled = all.filter((r) => r.status === 'CANCELLED')

  return (
    <div className="flex flex-col gap-4">
      <Anchor component={Link} to="/workshops" size="sm">
        ← All workshops
      </Anchor>

      <Paper withBorder radius="md" p="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <Text ff="monospace" fw={700} c="dimmed">
                {w.code}
              </Text>
              <Badge variant="dot" color={w.status === 'SCHEDULED' ? 'blue' : w.status === 'CANCELLED' ? 'red' : 'gray'}>
                {w.status.charAt(0) + w.status.slice(1).toLowerCase()}
              </Badge>
            </Group>
            <Title order={2}>{w.title}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {dayjs(w.startsAt).format('dddd D MMMM YYYY, HH:mm')}–{dayjs(w.endsAt).format('HH:mm')} ·{' '}
              {w.location} · with {w.instructor}
            </Text>
            {w.description && (
              <Text size="sm" mt="sm" maw={640}>
                {w.description}
              </Text>
            )}
          </div>
          <div className="text-right">
            <Text size="xl" fw={800} c={full ? 'red' : w.seatsLeft <= 2 ? 'orange' : 'green'} className="text-4xl leading-none">
              {w.seatsLeft}
            </Text>
            <Text size="sm" c="dimmed">
              {full ? 'Full' : `of ${w.capacity} seats left`}
            </Text>
          </div>
        </Group>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Title order={4} mb="sm">
          Register an attendee
        </Title>
        {closed ? (
          <Alert color="gray">{closed} No new registrations.</Alert>
        ) : full ? (
          <Alert color="orange">This workshop is full. A seat opens if someone cancels.</Alert>
        ) : (
          <form onSubmit={form.onSubmit((v) => register.mutate(v))} noValidate>
            <Stack gap="sm">
              {formError && (
                <Alert color="red" role="alert">
                  {formError}
                </Alert>
              )}
              <SimpleGrid cols={{ base: 1, sm: 3 }} className="items-end">
                <TextInput label="Name" required {...form.getInputProps('attendeeName')} />
                <TextInput label="Email" type="email" required {...form.getInputProps('attendeeEmail')} />
                <Button type="submit" loading={register.isPending}>
                  Register
                </Button>
              </SimpleGrid>
            </Stack>
          </form>
        )}
        {formError && (closed || full) && (
          <Alert color="red" mt="sm">
            {formError}
          </Alert>
        )}
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Tabs defaultValue="active">
          <Tabs.List>
            <Tabs.Tab value="active">Registered ({active.length})</Tabs.Tab>
            <Tabs.Tab value="cancelled">Cancelled ({cancelled.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="active" pt="sm">
            <RegistrationTable
              rows={active}
              loading={registrations.isPending}
              empty="No one is registered yet"
              onCancel={confirmCancel}
              cancellingId={cancel.isPending ? cancel.variables?.registration.id : undefined}
            />
          </Tabs.Panel>
          <Tabs.Panel value="cancelled" pt="sm">
            <RegistrationTable rows={cancelled} loading={registrations.isPending} empty="No cancellations" />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </div>
  )
}

function RegistrationTable({
  rows,
  loading,
  empty,
  onCancel,
  cancellingId,
}: {
  rows: Registration[]
  loading: boolean
  empty: string
  onCancel?: (r: Registration) => void
  cancellingId?: string
}) {
  const isCancelled = !onCancel
  const cols = isCancelled ? 6 : 5
  return (
    <Table.ScrollContainer minWidth={720}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Attendee</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Registered</Table.Th>
            {isCancelled ? (
              <>
                <Table.Th>Cancelled</Table.Th>
                <Table.Th>Reason</Table.Th>
              </>
            ) : (
              <Table.Th />
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading && (
            <Table.Tr>
              <Table.Td colSpan={cols}>
                <Group justify="center" p="md">
                  <Loader size="sm" />
                </Group>
              </Table.Td>
            </Table.Tr>
          )}
          {!loading && rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={cols}>
                <Text c="dimmed" ta="center" p="md">
                  {empty}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {r.attendeeName}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{r.attendeeEmail}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{fmt(r.registeredAt)}</Text>
                <Text size="xs" c="dimmed">
                  by {r.registeredBy?.name ?? 'Unknown'}
                </Text>
              </Table.Td>
              {isCancelled ? (
                <>
                  <Table.Td>
                    <Text size="sm">{r.cancelledAt ? fmt(r.cancelledAt) : '—'}</Text>
                    <Text size="xs" c="dimmed">
                      by {r.cancelledBy?.name ?? 'Unknown'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{r.cancelReason || '—'}</Text>
                  </Table.Td>
                </>
              ) : (
                <Table.Td>
                  <Group justify="flex-end">
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      loading={cancellingId === r.id}
                      onClick={() => onCancel?.(r)}
                    >
                      Cancel
                    </Button>
                  </Group>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
