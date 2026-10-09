import { useState } from 'react'
import { Alert, Button, Group, Modal, PasswordInput, Select, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { ApiError } from '../api/client'
import { createUser, updateUser, type UpdateUserBody } from '../api/users'
import { ROLES, type Role, type User } from '../types'

const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role,
  label: role.charAt(0).toUpperCase() + role.slice(1),
}))

const baseSchema = {
  name: z.string().trim().min(1, 'Name is required').max(255),
  email: z.email('Enter a valid email'),
  role: z.enum(ROLES),
}

const createSchema = z.object({
  ...baseSchema,
  password: z.string().min(8, 'At least 8 characters').max(72),
})

const editSchema = z.object({
  ...baseSchema,
  // Blank means "keep the current password".
  password: z
    .string()
    .max(72)
    .refine((v) => v === '' || v.length >= 8, 'At least 8 characters'),
})

type FormValues = {
  name: string
  email: string
  role: Role
  password: string
}

/** Mount only while open, so each opening starts from fresh values. */
interface Props {
  opened: boolean
  onClose: () => void
  /** Edit this user; omit to create a new one. */
  user?: User | null
  /** The signed-in admin, who may not change their own role. */
  currentUserId: string
}

export function UserFormModal({ opened, onClose, user, currentUserId }: Props) {
  const isEdit = Boolean(user)
  const isSelf = user?.id === currentUserId
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    initialValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'staff',
      password: '',
    },
    validate: zodResolver(isEdit ? editSchema : createSchema),
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!user) return createUser(values)
      const body: UpdateUserBody = { name: values.name, email: values.email }
      if (!isSelf) body.role = values.role
      if (values.password) body.password = values.password
      return updateUser(user.id, body)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      notifications.show({
        color: 'green',
        message: isEdit ? `Saved changes to ${saved.name}` : `Created account for ${saved.name}`,
      })
      onClose()
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    },
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'New user'}
      centered
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))} noValidate>
        <Stack>
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <TextInput label="Name" required data-autofocus {...form.getInputProps('name')} />
          <TextInput label="Email" type="email" required {...form.getInputProps('email')} />
          <Select
            label="Role"
            data={ROLE_OPTIONS}
            allowDeselect={false}
            disabled={isSelf}
            description={isSelf ? 'You cannot change your own role' : undefined}
            {...form.getInputProps('role')}
          />
          <PasswordInput
            label={isEdit ? 'New password' : 'Temporary password'}
            description={isEdit ? 'Leave blank to keep the current password' : 'At least 8 characters'}
            required={!isEdit}
            autoComplete="new-password"
            {...form.getInputProps('password')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
