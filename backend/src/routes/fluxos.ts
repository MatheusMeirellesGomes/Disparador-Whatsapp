import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Criar fluxo com etapas
router.post('/', async (req: Request, res: Response) => {
  const { nome, etapas } = req.body
  // etapas: [{ mensagem, delayMinutos, ordem }]

  const fluxo = await prisma.fluxo.create({
    data: {
      nome,
      etapas: {
        create: etapas.map((e: { mensagem: string; delayMinutos: number; ordem: number }) => ({
          mensagem: e.mensagem,
          delayMinutos: e.delayMinutos,
          ordem: e.ordem,
        })),
      },
    },
    include: { etapas: true },
  })

  res.status(201).json(fluxo)
})

// Listar fluxos
router.get('/', async (_req: Request, res: Response) => {
  const fluxos = await prisma.fluxo.findMany({ include: { etapas: { orderBy: { ordem: 'asc' } } } })
  res.json(fluxos)
})

// Adicionar lista ao fluxo (inicia execução para cada contato)
router.post('/:fluxoId/iniciar', async (req: Request, res: Response) => {
  const fluxoId = parseInt(req.params.fluxoId)
  const { listaId } = req.body

  const primeiraEtapa = await prisma.fluxoEtapa.findFirst({
    where: { fluxoId },
    orderBy: { ordem: 'asc' },
  })

  if (!primeiraEtapa) {
    res.status(400).json({ erro: 'Fluxo sem etapas' })
    return
  }

  const contatos = await prisma.contato.findMany({ where: { listaId } })

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
})

// Status de execuções de um fluxo
router.get('/:fluxoId/execucoes', async (req: Request, res: Response) => {
  const fluxoId = parseInt(req.params.fluxoId)
  const execucoes = await prisma.execucaoFluxo.findMany({
    where: { fluxoId },
    include: { contato: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(execucoes)
})

export default router
