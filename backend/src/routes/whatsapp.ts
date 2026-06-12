import { Router, Request, Response } from 'express'
import { getWhatsAppClient } from '../services/whatsapp'

const router = Router()

const isMock = () => process.env.WHATSAPP_MOCK !== 'false'

router.get('/status', async (_req: Request, res: Response) => {
  if (isMock()) {
    res.json({ status: 'conectado', mock: true })
    return
  }
  const client = getWhatsAppClient()
  const connected = await client.isConnected()
  const qr = await client.getQRCode()
  if (connected) {
    res.json({ status: 'conectado' })
  } else if (qr) {
    res.json({ status: 'aguardando_qr' })
  } else {
    res.json({ status: 'desconectado' })
  }
})

router.get('/qr', async (_req: Request, res: Response) => {
  if (isMock()) {
    res.json({ conectado: true, qr: null, status: 'conectado' })
    return
  }
  const client = getWhatsAppClient()
  const connected = await client.isConnected()
  const qr = await client.getQRCode()
  let status = 'desconectado'
  if (connected) status = 'conectado'
  else if (qr) status = 'aguardando_qr'
  res.json({ conectado: connected, qr, status })
})

router.post('/enviar', async (req: Request, res: Response) => {
  const { telefone, mensagem } = req.body
  if (!telefone || !mensagem) {
    res.status(400).json({ erro: 'telefone e mensagem obrigatórios' })
    return
  }
  if (isMock()) {
    console.log(`[Mock] Enviado → ${telefone}: ${mensagem}`)
    res.json({ ok: true })
    return
  }
  try {
    console.log(`[WhatsApp] Tentando enviar para ${telefone}...`)
    const client = getWhatsAppClient()
    await client.sendMessage(telefone, mensagem)
    console.log(`[WhatsApp] ✅ Enviado para ${telefone}`)
    res.json({ ok: true })
  } catch (err) {
    console.error(`[WhatsApp] ❌ Erro ao enviar para ${telefone}:`, err)
    res.status(500).json({ erro: String(err) })
  }
})

router.post('/iniciar', (_req: Request, res: Response) => {
  if (isMock()) {
    res.json({ mensagem: 'Modo mock ativo' })
    return
  }
  const client = getWhatsAppClient()
  res.json({ mensagem: 'Iniciando sessão...' })
  client.initialize().catch((err: unknown) => {
    console.error('[WhatsApp] Falha ao iniciar:', err)
  })
})

export default router
