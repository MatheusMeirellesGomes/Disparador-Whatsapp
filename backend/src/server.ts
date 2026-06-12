import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import contatosRoutes from './routes/contatos'
import campanhasRoutes from './routes/campanhas'
import fluxosRoutes from './routes/fluxos'
import whatsappRoutes from './routes/whatsapp'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/contatos', contatosRoutes)
app.use('/campanhas', campanhasRoutes)
app.use('/fluxos', fluxosRoutes)
app.use('/whatsapp', whatsappRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, async () => {
  console.log(`[API] Rodando na porta ${PORT}`)
  const isMock = process.env.WHATSAPP_MOCK !== 'false'
  console.log(`[API] Modo WhatsApp: ${isMock ? 'MOCK' : 'REAL'}`)

  if (!isMock) {
    const { getWhatsAppClient } = await import('./services/whatsapp')
    const client = getWhatsAppClient()
    console.log('[API] Inicializando sessão WhatsApp...')
    client.initialize().catch((err: unknown) => {
      console.error('[API] Falha ao inicializar WhatsApp:', err)
    })
  }
})
