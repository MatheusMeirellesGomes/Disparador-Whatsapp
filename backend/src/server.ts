import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import contatosRoutes from './routes/contatos'
import campanhasRoutes from './routes/campanhas'
import fluxosRoutes from './routes/fluxos'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/contatos', contatosRoutes)
app.use('/campanhas', campanhasRoutes)
app.use('/fluxos', fluxosRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
