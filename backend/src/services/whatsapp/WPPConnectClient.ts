import { IWhatsAppClient } from './IWhatsAppClient'

export class WPPConnectClient implements IWhatsAppClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null
  private qrCode: string | null = null
  private connected = false

  constructor(private readonly sessionName: string) {}

  async initialize(): Promise<void> {
    try {
      const wppconnect = await import('@wppconnect-team/wppconnect')

      this.client = await wppconnect.create({
        session: this.sessionName,
        folderNameToken: './wppconnect-sessions',
        headless: true,
        logQR: false,
        autoClose: 0,
        catchQR: (base64Qr: string) => {
          this.qrCode = base64Qr
          console.log('[WhatsApp] QR Code gerado — escaneie com o celular')
        },
        statusFind: (statusSession: string) => {
          console.log('[WhatsApp] Status:', statusSession)
          if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess' || statusSession === 'inChat') {
            this.connected = true
            this.qrCode = null
            console.log('[WhatsApp] ✅ Conectado!')
          }
          if (
            statusSession === 'notLogged' ||
            statusSession === 'browserClose' ||
            statusSession === 'desconnectedMobile'
          ) {
            this.connected = false
            console.log('[WhatsApp] Sessão encerrada')
          }
        },
      })

      this.connected = true
      console.log('[WhatsApp] Sessão iniciada com sucesso')
    } catch (err) {
      console.error('[WhatsApp] Erro ao inicializar:', err)
      throw err
    }
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.client) throw new Error('WhatsApp não inicializado')

    const digits = phone.replace(/\D/g, '')
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`
    const chatId = `${withCountry}@c.us`

    const status = await this.client.checkNumberStatus(chatId)
    if (!status || !status.numberExists) {
      throw new Error(`Número ${phone} não encontrado no WhatsApp`)
    }

    await this.client.sendText(status.id._serialized, message)
  }

  async isConnected(): Promise<boolean> {
    return this.connected
  }

  async getQRCode(): Promise<string | null> {
    return this.qrCode
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.connected = false
      console.log('[WhatsApp] Desconectado')
    }
  }

  async getAllContacts(): Promise<Array<{ nome: string; telefone: string }>> {
    if (!this.client) return []
    try {
      const contacts = await this.client.getAllContacts()
      return (contacts as any[])
        .filter((c) =>
          c.id?._serialized?.includes('@c.us') &&
          !c.isMe &&
          !c.isGroup &&
          c.isMyContact === true
        )
        .map((c) => ({
          nome: c.name || c.pushname || c.verifiedName || 'Sem nome',
          telefone: c.id._serialized.replace('@c.us', ''),
        }))
        .filter((c) => c.telefone.length >= 10)
    } catch {
      return []
    }
  }
}
