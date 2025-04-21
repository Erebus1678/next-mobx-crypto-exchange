import Container from '@mui/material/Container'

import ExchangeForm from '@/components/ExchangeForm'
import Title from '@/components/Title'
export default function Home() {
  return (
    <Container component="main" maxWidth="md" sx={{ mt: '25dvh' }}>
      <Title />
      <ExchangeForm />
    </Container>
  )
}
