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

let client: Awaited<ReturnType<typeof wppconnect.create>> | null = null
let iniciando = false

// ─── estado compartilhado via arquivo ────────────────────────────────────────

function salvarEstado(status: Status, qr: string | null) {
  try {
    const state: WppState = { status, qr, updatedAt: new Date().toISOString() }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8')
  } catch (e) {
    console.error('[WHATSAPP] Erro ao salvar estado:', e)
  }
}

export function lerEstado(): WppState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    }
  } catch {}
  return { status: 'desconectado', qr: null, updatedAt: new Date().toISOString() }
}

// ─── usadas pela API ──────────────────────────────────────────────────────────

export function getStatus(): Status {
  if (MOCK_MODE) return 'conectado'
  return lerEstado().status
}

export function getQrCode(): string | null {
  return lerEstado().qr
}

export function solicitarInicio() {
  fs.writeFileSync(INIT_FLAG, '1', 'utf8')
  console.log('[WHATSAPP] Flag de início gravada')
}

// ─── usadas pelo worker ───────────────────────────────────────────────────────

export function verificarFlagInicio(): boolean {
  if (fs.existsSync(INIT_FLAG)) {
    try { fs.unlinkSync(INIT_FLAG) } catch {}
    return true
  }
  return false
}

export async function iniciarSessao() {
  if (MOCK_MODE) {
    console.log('[WHATSAPP] Modo mock — sessão real não iniciada')
    return
  }
  if (iniciando || client) {
    console.log('[WHATSAPP] Sessão já em andamento ou conectada')
    return
  }

  iniciando = true
  salvarEstado('aguardando_qr', null)
  console.log('[WHATSAPP] Iniciando sessão WPPConnect...')

  // Usa o Chrome bundled do puppeteer
  let executablePath: string | undefined
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require('puppeteer')
    executablePath = puppeteer.executablePath() as string
    console.log('[WHATSAPP] Chrome:', executablePath)
  } catch {
    console.log('[WHATSAPP] puppeteer não encontrado, usando Chrome do sistema')
  }

  try {
    client = await wppconnect.create({
      session: 'disparador',
      catchQR: (base64Qr: string) => {
        console.log('[WHATSAPP] QR Code gerado!')
        salvarEstado('aguardando_qr', base64Qr)
      },
      statusFind: (status: string) => {
        console.log('[WHATSAPP] Status recebido:', status)
        if (status === 'inChat' || status === 'isLogged' || status === 'qrReadSuccess') {
          salvarEstado('conectado', null)
          console.log('[WHATSAPP] ✅ Conectado!')
        }
        if (
          status === 'notLogged' ||
          status === 'browserClose' ||
          status === 'desconnectedMobile' ||
          status === 'deleteToken'
        ) {
          salvarEstado('desconectado', null)
          client = null
          iniciando = false
          console.log('[WHATSAPP] Sessão encerrada:', status)
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
      puppeteerOptions: {
        ...(executablePath ? { executablePath } : {}),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    })

    salvarEstado('conectado', null)
    console.log('[WHATSAPP] ✅ Sessão iniciada com sucesso!')
  } catch (err) {
    console.error('[WHATSAPP] Erro ao iniciar sessão:', err)
    salvarEstado('desconectado', null)
    client = null
  } finally {
    iniciando = false
  }
}

// ─── envio (apenas no worker) ─────────────────────────────────────────────────

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
