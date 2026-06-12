import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Criar fluxo com etapas
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, etapas } = req.body

    if (!nome || !Array.isArray(etapas) || etapas.length === 0) {
      res.status(400).json({ erro: 'nome e ao menos uma etapa são obrigatórios' })
      return
    }

    const fluxo = await prisma.fluxo.create({
      data: {
        nome,
        etapas: {
          create: etapas.map((e: { mensagem: string; delayMinutos: number; ordem: number }) => ({
            mensagem: e.mensagem,
            delayMinutos: Number(e.delayMinutos),
            ordem: Number(e.ordem),
          })),
        },
      },
      include: { etapas: true },
    })

    res.status(201).json(fluxo)
  } catch (err) {
    console.error('[FLUXO] Erro ao criar:', err)
    res.status(500).json({ erro: String(err) })
  }
})

// Listar fluxos
router.get('/', async (_req: Request, res: Response) => {
  try {
    const fluxos = await prisma.fluxo.findMany({ include: { etapas: { orderBy: { ordem: 'asc' } } } })
    res.json(fluxos)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Adicionar lista ao fluxo (inicia execução para cada contato)
router.post('/:fluxoId/iniciar', async (req: Request, res: Response) => {
  try {
    const fluxoId = parseInt(req.params.fluxoId)
    const { listaId } = req.body

    if (!listaId) {
      res.status(400).json({ erro: 'listaId é obrigatório' })
      return
    }

    const primeiraEtapa = await prisma.fluxoEtapa.findFirst({
      where: { fluxoId },
      orderBy: { ordem: 'asc' },
    })

    if (!primeiraEtapa) {
      res.status(400).json({ erro: 'Fluxo sem etapas' })
      return
    }

    const contatos = await prisma.contato.findMany({ where: { listaId: Number(listaId) } })

    if (contatos.length === 0) {
      res.status(400).json({ erro: 'A lista selecionada não possui contatos' })
      return
    }

    await prisma.execucaoFluxo.createMany({
      data: contatos.map((c) => ({
        contatoId: c.id,
        fluxoId,
        etapaAtual: 0,
        nextExecutionAt: new Date(),
        status: 'ativo',
      })),
    })

    res.status(201).json({ iniciados: contatos.length })
  } catch (err) {
    console.error('[FLUXO] Erro ao iniciar:', err)
    res.status(500).json({ erro: String(err) })
  }
})

// Status de execuções de um fluxo
router.get('/:fluxoId/execucoes', async (req: Request, res: Response) => {
  try {
    const fluxoId = parseInt(req.params.fluxoId)
    const execucoes = await prisma.execucaoFluxo.findMany({
      where: { fluxoId },
      include: { contato: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(execucoes)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Remover fluxo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    await prisma.execucaoFluxo.deleteMany({ where: { fluxoId: id } })
    await prisma.fluxoEtapa.deleteMany({ where: { fluxoId: id } })
    await prisma.fluxo.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

export default router
