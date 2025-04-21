'use client'

import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

//For fun, hope you like it
const GradientText = styled(Typography)({
  backgroundImage: 'linear-gradient(90deg, #FF8A00, #E52E71, #0072FF, #00DBDE, #FF8A00)',
  backgroundSize: '500% 100%',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  animation: 'gradientFlow 8s ease infinite',
  '@keyframes gradientFlow': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  fontWeight: 'bold',
})

const Title = () => {
  return (
    <GradientText variant="h2" gutterBottom align="center" sx={{ mb: 4 }}>
      Crypto Exchange
    </GradientText>
  )
}

export default Title
