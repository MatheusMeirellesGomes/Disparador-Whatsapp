import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Criar campanha e popular fila_envio
router.post('/', async (req: Request, res: Response) => {
  const { nome, mensagem, delayMin, delayMax, listaId } = req.body

  const campanha = await prisma.campanha.create({
    data: { nome, mensagem, delayMin, delayMax, listaId },
  })

  const contatos = await prisma.contato.findMany({ where: { listaId } })

  let acumulado = 0
  const agora = new Date()

  const filaItens = contatos.map((contato) => {
    const delay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin
    acumulado += delay
    const scheduledAt = new Date(agora.getTime() + acumulado * 1000)
    return {
      contatoId: contato.id,
      campanhaId: campanha.id,
      mensagem,
      scheduledAt,
    }
  })

  await prisma.filaEnvio.createMany({ data: filaItens })

  await prisma.campanha.update({ where: { id: campanha.id }, data: { status: 'agendada' } })

  res.status(201).json({ campanha, agendados: filaItens.length })
})

// Listar campanhas
router.get('/', async (_req: Request, res: Response) => {
  const campanhas = await prisma.campanha.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(campanhas)
})

// Detalhes de uma campanha com status da fila
router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const campanha = await prisma.campanha.findUnique({ where: { id } })
  const fila = await prisma.filaEnvio.groupBy({
    by: ['status'],
    where: { campanhaId: id },
    _count: true,
  })
  res.json({ campanha, fila })
})

export default router
