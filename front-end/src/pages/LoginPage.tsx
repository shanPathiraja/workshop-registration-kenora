import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Container, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { ApiError } from '../api/client'
import { useAuth } from '../hooks/useAuth'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: zodResolver(loginSchema),
  })

  if (user) return <Navigate to="/" replace />

  const handleSubmit = form.onSubmit(async ({ email, password }) => {
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <Container size={420} my={60}>
      <Title ta="center" mb="lg">
        Sign in
      </Title>
      <Paper withBorder shadow="sm" p="xl" radius="md">
        <form onSubmit={handleSubmit} noValidate>
          <Stack>
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              required
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              required
              {...form.getInputProps('password')}
            />
            <Button type="submit" loading={submitting} fullWidth>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
