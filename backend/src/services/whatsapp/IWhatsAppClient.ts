export interface IWhatsAppClient {
  initialize(): Promise<void>
  sendMessage(phone: string, message: string): Promise<void>
  isConnected(): Promise<boolean>
  getQRCode(): Promise<string | null>
  disconnect(): Promise<void>
}
