import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { enviarMensagem } from './services/whatsapp'

dotenv.config()

const prisma = new PrismaClient()
const INTERVALO_MS = 5000

async function processarFilaCampanha() {
  const pendentes = await prisma.filaEnvio.findMany({
    where: {
      status: 'pendente',
      scheduledAt: { lte: new Date() },
    },
    include: { contato: true },
    take: 10,
  })

  for (const item of pendentes) {
    try {
      await prisma.filaEnvio.update({ where: { id: item.id }, data: { status: 'processando' } })
      await enviarMensagem(item.contato.telefone, item.mensagem)
      await prisma.filaEnvio.update({
        where: { id: item.id },
        data: { status: 'enviado', sentAt: new Date() },
      })
      console.log(`[CAMPANHA] Enviado para ${item.contato.telefone}`)
    } catch (err) {
      await prisma.filaEnvio.update({ where: { id: item.id }, data: { status: 'erro' } })
      console.error(`[CAMPANHA] Erro ao enviar para ${item.contato.telefone}:`, err)
    }
  }
}

async function processarFluxos() {
  const execucoes = await prisma.execucaoFluxo.findMany({
    where: {
      status: 'ativo',
      nextExecutionAt: { lte: new Date() },
    },
    include: {
      contato: true,
      fluxo: { include: { etapas: { orderBy: { ordem: 'asc' } } } },
    },
    take: 10,
  })

  for (const execucao of execucoes) {
    const etapas = execucao.fluxo.etapas
    const etapaIndex = execucao.etapaAtual

    if (etapaIndex >= etapas.length) {
      await prisma.execucaoFluxo.update({ where: { id: execucao.id }, data: { status: 'concluido' } })
      continue
    }

    const etapa = etapas[etapaIndex]

    try {
      await enviarMensagem(execucao.contato.telefone, etapa.mensagem)
      console.log(`[FLUXO] Etapa ${etapaIndex + 1} enviada para ${execucao.contato.telefone}`)

      const proximaEtapaIndex = etapaIndex + 1
      const proximaEtapa = etapas[proximaEtapaIndex]

      if (!proximaEtapa) {
        await prisma.execucaoFluxo.update({ where: { id: execucao.id }, data: { status: 'concluido' } })
      } else {
        const nextExecutionAt = new Date(Date.now() + proximaEtapa.delayMinutos * 60 * 1000)
        await prisma.execucaoFluxo.update({
          where: { id: execucao.id },
          data: { etapaAtual: proximaEtapaIndex, nextExecutionAt },
        })
      }
    } catch (err) {
      console.error(`[FLUXO] Erro para ${execucao.contato.telefone}:`, err)
    }
  }
}

async function tick() {
  try {
    await processarFilaCampanha()
    await processarFluxos()
  } catch (err) {
    console.error('[WORKER] Erro no tick:', err)
  } finally {
    setTimeout(tick, INTERVALO_MS)
  }
}

console.log('[WORKER] Iniciando...')
tick()
