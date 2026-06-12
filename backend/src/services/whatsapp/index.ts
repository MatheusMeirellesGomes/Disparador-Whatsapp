import { IWhatsAppClient } from './IWhatsAppClient'
import { MockWhatsAppClient } from './MockWhatsAppClient'
import { WPPConnectClient } from './WPPConnectClient'

let instance: IWhatsAppClient | null = null

export function getWhatsAppClient(): IWhatsAppClient {
  if (!instance) {
    if (process.env.WHATSAPP_MOCK !== 'false') {
      instance = new MockWhatsAppClient()
    } else {
      instance = new WPPConnectClient('disparador')
    }
  }
  return instance
}

export type { IWhatsAppClient }
