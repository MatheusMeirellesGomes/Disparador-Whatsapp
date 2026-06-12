import wppconnect from '@wppconnect-team/wppconnect'
import fs from 'fs'
import path from 'path'

const MOCK_MODE = process.env.WHATSAPP_MOCK !== 'false'

const STATE_FILE = path.join(process.cwd(), 'wpp-state.json')
const INIT_FLAG  = path.join(process.cwd(), 'wpp-init.flag')

type Status = 'desconectado' | 'aguardando_qr' | 'conectado'

interface WppState {
  status: Status
  qr: string | null
  updatedAt: string
}

// cliente vive apenas no processo do worker
let client: Awaited<ReturnType<typeof wppconnect.create>> | null = null
let iniciando = false

// ─── estado compartilhado via arquivo (API lê, Worker escreve) ───────────────

function salvarEstado(status: Status, qr: string | null) {
  const state: WppState = { status, qr, updatedAt: new Date().toISOString() }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8')
}

export function lerEstado(): WppState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    }
  } catch {}
  return { status: 'desconectado', qr: null, updatedAt: new Date().toISOString() }
}

// ─── API usa estas funções ────────────────────────────────────────────────────

export function getStatus(): Status {
  if (MOCK_MODE) return 'conectado'
  return lerEstado().status
}

export function getQrCode(): string | null {
  return lerEstado().qr
}

// API escreve flag → worker detecta e inicia sessão
export function solicitarInicio() {
  fs.writeFileSync(INIT_FLAG, '1', 'utf8')
}

// ─── Worker usa estas funções ─────────────────────────────────────────────────

export function verificarFlagInicio(): boolean {
  if (fs.existsSync(INIT_FLAG)) {
    fs.unlinkSync(INIT_FLAG)
    return true
  }
  return false
}

export async function iniciarSessao() {
  if (MOCK_MODE || client || iniciando) return
  iniciando = true

  console.log('[WHATSAPP] Iniciando sessão WPPConnect...')
  salvarEstado('aguardando_qr', null)

  // Caminho do Chrome bundled pelo puppeteer
  let executablePath: string | undefined
  try {
    const puppeteer = require('puppeteer')
    executablePath = puppeteer.executablePath()
    console.log('[WHATSAPP] Chrome:', executablePath)
  } catch {
    console.log('[WHATSAPP] Usando Chrome padrão do sistema')
  }

  try {
    client = await wppconnect.create({
      session: 'disparador',
      catchQR: (base64Qr: string) => {
        salvarEstado('aguardando_qr', base64Qr)
        console.log('[WHATSAPP] QR Code gerado — escaneie pelo celular')
      },
      statusFind: (status: string) => {
        console.log('[WHATSAPP] Status:', status)
        if (status === 'inChat' || status === 'isLogged') {
          salvarEstado('conectado', null)
          console.log('[WHATSAPP] ✅ Conectado!')
        }
        if (status === 'notLogged' || status === 'browserClose' || status === 'desconnectedMobile') {
          salvarEstado('desconectado', null)
          client = null
          iniciando = false
        }
      },
      headless: true,
      devtools: false,
      useChrome: false,
      debug: false,
      logQR: false,
      autoClose: 0,
      tokenStore: 'file',
      folderNameToken: './wppconnect-sessions',
      puppeteerOptions: executablePath ? { executablePath } : {},
    })

    salvarEstado('conectado', null)
    console.log('[WHATSAPP] ✅ Sessão iniciada!')
  } catch (err) {
    console.error('[WHATSAPP] Erro ao iniciar sessão:', err)
    salvarEstado('desconectado', null)
    client = null
  } finally {
    iniciando = false
  }
}

// ─── Envio de mensagem (apenas no worker) ────────────────────────────────────

export async function enviarMensagem(telefone: string, mensagem: string): Promise<void> {
  if (MOCK_MODE) {
    console.log(`[MOCK] Enviando para ${telefone}: ${mensagem}`)
    await new Promise((resolve) => setTimeout(resolve, 300))
    return
  }

  if (!client) throw new Error('WhatsApp não está conectado')

  const numero = normalizarTelefone(telefone)
  await client.sendText(`${numero}@c.us`, mensagem)
  console.log(`[WHATSAPP] ✅ Enviado para ${numero}`)
}

function normalizarTelefone(telefone: string): string {
  let numero = telefone.replace(/\D/g, '')
  if (!numero.startsWith('55')) numero = '55' + numero
  return numero
}
