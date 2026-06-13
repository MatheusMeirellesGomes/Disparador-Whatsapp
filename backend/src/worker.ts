import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const INTERVALO_MS = 5000
const API_URL = `http://localhost:${process.env.PORT || 3000}`

async function isWhatsAppConnected(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/whatsapp/status`, { signal: AbortSignal.timeout(5000) })
    const data = await res.json() as { status: string }
    return data.status === 'conectado'
  } catch {
    return false
  }
}

async function enviarMensagem(telefone: string, mensagem: string): Promise<void> {
  const res = await fetch(`${API_URL}/whatsapp/enviar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, mensagem }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Falha ao enviar: ${body}`)
  }
}

function personalizarMensagem(mensagem: string, nome: string): string {
  return mensagem.replace(/\{\{nome\}\}/gi, nome)
}

async function processarFilaCampanha() {
  const conectado = await isWhatsAppConnected()
  if (!conectado) {
    console.log('[WORKER] WhatsApp não conectado — aguardando...')
    return
  }

  const pendentes = await prisma.filaEnvio.findMany({
    where: { status: 'pendente', scheduledAt: { lte: new Date() } },
    include: { contato: true },
    take: 5,
  })

  for (const item of pendentes) {
    try {
      await prisma.filaEnvio.update({ where: { id: item.id }, data: { status: 'processando' } })
      const mensagemFinal = personalizarMensagem(item.mensagem, item.contato.nome)
      await enviarMensagem(item.contato.telefone, mensagemFinal)
      await prisma.filaEnvio.update({ where: { id: item.id }, data: { status: 'enviado', sentAt: new Date() } })
      console.log(`[CAMPANHA] ✅ Enviado → ${item.contato.nome} (${item.contato.telefone})`)
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      await prisma.filaEnvio.update({ where: { id: item.id }, data: { status: 'erro' } })
      console.error(`[CAMPANHA] ❌ Erro → ${item.contato.telefone}:`, err)
    }
  }
}

async function processarFluxos() {
  const conectado = await isWhatsAppConnected()
  if (!conectado) return

  const execucoes = await prisma.execucaoFluxo.findMany({
    where: { status: 'ativo', nextExecutionAt: { lte: new Date() } },
    include: { contato: true, fluxo: { include: { etapas: { orderBy: { ordem: 'asc' } } } } },
    take: 5,
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
      const mensagemFinal = personalizarMensagem(etapa.mensagem, execucao.contato.nome)
      await enviarMensagem(execucao.contato.telefone, mensagemFinal)
      console.log(`[FLUXO] ✅ Etapa ${etapaIndex + 1} → ${execucao.contato.nome} (${execucao.contato.telefone})`)

      const proximaIndex = etapaIndex + 1
      const proximaEtapa = etapas[proximaIndex]

      if (!proximaEtapa) {
        await prisma.execucaoFluxo.update({ where: { id: execucao.id }, data: { status: 'concluido' } })
      } else {
        const nextExecutionAt = new Date(Date.now() + proximaEtapa.delayMinutos * 60 * 1000)
        await prisma.execucaoFluxo.update({ where: { id: execucao.id }, data: { etapaAtual: proximaIndex, nextExecutionAt } })
      }

      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error(`[FLUXO] ❌ Erro → ${execucao.contato.telefone}:`, err)
    }
  }
}

async function tick() {
  try {
    await processarFilaCampanha()
    await processarFluxos()
  } catch (err) {
    console.error('[WORKER] Erro:', err)
  } finally {
    setTimeout(tick, INTERVALO_MS)
  }
}

console.log('[WORKER] Iniciando — aguardando 15s para WhatsApp conectar...')
setTimeout(() => {
  console.log('[WORKER] Começando a processar fila...')
  tick()
}, 15000)
