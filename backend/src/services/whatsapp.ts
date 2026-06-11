const MOCK_MODE = process.env.WHATSAPP_MOCK === 'true' || true

export async function enviarMensagem(telefone: string, mensagem: string): Promise<void> {
  if (MOCK_MODE) {
    console.log(`[MOCK] Enviando para ${telefone}: ${mensagem}`)
    await new Promise((resolve) => setTimeout(resolve, 300))
    return
  }

  // WPPConnect integration (implementar quando tiver sessão autenticada)
  throw new Error('WPPConnect não configurado')
}
