import { IWhatsAppClient } from './IWhatsAppClient'

export class MockWhatsAppClient implements IWhatsAppClient {
  private connected = true

  async initialize(): Promise<void> {
    console.log('[WhatsApp Mock] Inicializado')
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    console.log(`[WhatsApp Mock] Enviado → ${phone}: ${message}`)
  }

  async isConnected(): Promise<boolean> {
    return this.connected
  }

  async getQRCode(): Promise<string | null> {
    return null
  }

  async disconnect(): Promise<void> {
    this.connected = false
    console.log('[WhatsApp Mock] Desconectado')
  }
}
