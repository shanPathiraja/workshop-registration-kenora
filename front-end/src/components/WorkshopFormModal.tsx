import { useState } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { ApiError } from '../api/client'
import { createWorkshop, updateWorkshop, type WorkshopBody } from '../api/workshops'
import type { Workshop } from '../types'

const PICKER_FORMAT = 'YYYY-MM-DD HH:mm:ss'

type FormValues = {
  code: string
  title: string
  description: string
  instructor: string
  location: string
  startsAt: string | null
  endsAt: string | null
  capacity: number | string
}

function schemaFor(minCapacity: number) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9-]{2,20}$/, '2–20 letters, numbers or dashes'),
      title: z.string().trim().min(1, 'Title is required').max(200),
      description: z.string().max(2000),
      instructor: z.string().trim().min(1, 'Instructor is required').max(200),
      location: z.string().trim().min(1, 'Location is required').max(200),
      startsAt: z.string({ error: 'Start is required' }).min(1, 'Start is required'),
      endsAt: z.string({ error: 'End is required' }).min(1, 'End is required'),
      capacity: z.coerce
        .number({ error: 'Capacity is required' })
        .int('Whole seats only')
        .min(Math.max(1, minCapacity), minCapacity > 0
          ? `${minCapacity} people are already registered`
          : 'At least 1 seat')
        .max(1000),
    })
    .refine((v) => dayjs(v.endsAt).isAfter(dayjs(v.startsAt)), {
      path: ['endsAt'],
      message: 'Must be after the start',
    })
}

/** Mount only while open, so each opening starts from fresh values. */
interface Props {
  onClose: () => void
  /** Edit this workshop; omit to create a new one. */
  workshop?: Workshop | null
}

export function WorkshopFormModal({ onClose, workshop }: Props) {
  const isEdit = Boolean(workshop)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const booked = workshop?.activeCount ?? 0

  const form = useForm<FormValues>({
    initialValues: {
      code: workshop?.code ?? '',
      title: workshop?.title ?? '',
      description: workshop?.description ?? '',
      instructor: workshop?.instructor ?? '',
      location: workshop?.location ?? '',
      startsAt: workshop ? dayjs(workshop.startsAt).format(PICKER_FORMAT) : null,
      endsAt: workshop ? dayjs(workshop.endsAt).format(PICKER_FORMAT) : null,
      capacity: workshop?.capacity ?? 20,
    },
    validate: zodResolver(schemaFor(booked)),
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body: WorkshopBody = {
        code: values.code.trim().toUpperCase(),
        title: values.title.trim(),
        description: values.description.trim() || null,
        instructor: values.instructor.trim(),
        location: values.location.trim(),
        startsAt: dayjs(values.startsAt).toISOString(),
        endsAt: dayjs(values.endsAt).toISOString(),
        capacity: Number(values.capacity),
      }
      return workshop ? updateWorkshop(workshop.id, body) : createWorkshop(body)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] })
      queryClient.invalidateQueries({ queryKey: ['workshop', saved.id] })
      notifications.show({
        color: 'green',
        message: isEdit ? `Saved ${saved.code}` : `Created ${saved.code}`,
      })
      onClose()
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    },
  })

  return (
    <Modal opened onClose={onClose} title={isEdit ? 'Edit workshop' : 'New workshop'} size="lg" centered>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))} noValidate>
        <Stack>
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput label="Code" placeholder="POT-101" required data-autofocus {...form.getInputProps('code')} />
            <TextInput
              label="Title"
              required
              className="sm:col-span-2"
              {...form.getInputProps('title')}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Instructor" required {...form.getInputProps('instructor')} />
            <TextInput label="Location" placeholder="Main Hall" required {...form.getInputProps('location')} />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <DateTimePicker
              label="Starts"
              required
              valueFormat="ddd D MMM YYYY, HH:mm"
              placeholder="Pick date and time"
              {...form.getInputProps('startsAt')}
            />
            <DateTimePicker
              label="Ends"
              required
              valueFormat="ddd D MMM YYYY, HH:mm"
              placeholder="Pick date and time"
              {...form.getInputProps('endsAt')}
            />
          </SimpleGrid>
          <NumberInput
            label="Capacity (seats)"
            required
            min={Math.max(1, booked)}
            max={1000}
            allowDecimal={false}
            description={booked > 0 ? `${booked} people already registered` : undefined}
            className="max-w-xs"
            {...form.getInputProps('capacity')}
          />
          <Textarea label="Description" autosize minRows={2} maxRows={6} {...form.getInputProps('description')} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create workshop'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
