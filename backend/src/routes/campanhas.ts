import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Criar campanha e popular fila_envio
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, mensagem, delayMin, delayMax, listaId } = req.body

    if (!nome || !mensagem || !listaId) {
      res.status(400).json({ erro: 'nome, mensagem e listaId são obrigatórios' })
      return
    }

    const min = Number(delayMin)
    const max = Number(delayMax)

    if (isNaN(min) || isNaN(max) || min < 1 || max < min) {
      res.status(400).json({ erro: 'delayMin e delayMax inválidos' })
      return
    }

    const contatos = await prisma.contato.findMany({ where: { listaId: Number(listaId) } })

    if (contatos.length === 0) {
      res.status(400).json({ erro: 'A lista selecionada não possui contatos' })
      return
    }

    const campanha = await prisma.campanha.create({
      data: { nome, mensagem, delayMin: min, delayMax: max, listaId: Number(listaId) },
    })

    let acumulado = 0
    const agora = new Date()

    const filaItens = contatos.map((contato) => {
      const delay = Math.floor(Math.random() * (max - min + 1)) + min
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
  } catch (err) {
    console.error('[CAMPANHA] Erro ao criar:', err)
    res.status(500).json({ erro: String(err) })
  }
})

// Listar campanhas com progresso
router.get('/', async (_req: Request, res: Response) => {
  try {
    const campanhas = await prisma.campanha.findMany({ orderBy: { createdAt: 'desc' } })
    const campanhasComProgresso = await Promise.all(
      campanhas.map(async (c) => {
        const fila = await prisma.filaEnvio.groupBy({
          by: ['status'],
          where: { campanhaId: c.id },
          _count: true,
        })
        const total = fila.reduce((acc, f) => acc + f._count, 0)
        const enviados = fila.find((f) => f.status === 'enviado')?._count ?? 0
        const erros = fila.find((f) => f.status === 'erro')?._count ?? 0
        const pendentes = fila.find((f) => f.status === 'pendente')?._count ?? 0
        return { ...c, total, enviados, erros, pendentes }
      })
    )
    res.json(campanhasComProgresso)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Detalhes de uma campanha com status da fila
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const campanha = await prisma.campanha.findUnique({ where: { id } })
    const fila = await prisma.filaEnvio.groupBy({
      by: ['status'],
      where: { campanhaId: id },
      _count: true,
    })
    res.json({ campanha, fila })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Retentar mensagens com erro
router.post('/:id/retentar', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const result = await prisma.filaEnvio.updateMany({
      where: { campanhaId: id, status: 'erro' },
      data: { status: 'pendente', scheduledAt: new Date() },
    })
    res.json({ reagendados: result.count })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Remover campanha
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    await prisma.filaEnvio.deleteMany({ where: { campanhaId: id } })
    await prisma.campanha.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

export default router
