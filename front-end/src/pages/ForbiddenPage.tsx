import { Link } from 'react-router-dom'
import { Button, Container, Stack, Text, Title } from '@mantine/core'

export function ForbiddenPage() {
  return (
    <Container size={420} my={80}>
      <Stack align="center">
        <Title order={2}>You don’t have access</Title>
        <Text c="dimmed" ta="center">
          Your account doesn’t have permission to view this page.
        </Text>
        <Button component={Link} to="/" variant="light">
          Go back home
        </Button>
      </Stack>
    </Container>
  )
}
