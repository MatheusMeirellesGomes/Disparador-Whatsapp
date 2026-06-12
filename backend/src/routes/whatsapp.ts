import { Router, Request, Response } from 'express'
import { getQrCode, getStatus, solicitarInicio, lerEstado } from '../services/whatsapp'

const router = Router()

router.get('/status', (_req: Request, res: Response) => {
  res.json({ status: getStatus() })
})

router.get('/qr', (_req: Request, res: Response) => {
  const estado = lerEstado()

  if (estado.status === 'conectado') {
    res.json({ conectado: true, qr: null })
    return
  }

  res.json({
    conectado: false,
    qr: estado.qr,
    status: estado.status,
    mensagem: estado.qr ? null : 'Aguardando geração do QR Code...',
  })
})

router.post('/iniciar', (_req: Request, res: Response) => {
  solicitarInicio()
  res.json({ mensagem: 'Solicitação enviada ao worker. QR Code será gerado em instantes.' })
})

export default router
