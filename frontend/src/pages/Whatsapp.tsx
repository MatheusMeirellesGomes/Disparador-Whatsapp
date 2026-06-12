import { useState, useEffect, useRef } from 'react'
import { get, post } from '../services/api'

interface StatusResponse {
  status: 'desconectado' | 'aguardando_qr' | 'conectado'
}

interface QrResponse {
  conectado: boolean
  qr: string | null
  mensagem?: string
}

export default function Whatsapp() {
  const [status, setStatus] = useState<'desconectado' | 'aguardando_qr' | 'conectado'>('desconectado')
  const [qr, setQr] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    verificarStatus()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  async function verificarStatus() {
    try {
      const res = await get<StatusResponse>('/whatsapp/status')
      setStatus(res.status)

      if (res.status === 'aguardando_qr') {
        buscarQr()
        iniciarPolling()
      } else if (res.status === 'conectado') {
        setQr(null)
        pararPolling()
      }
    } catch {}
  }

  async function buscarQr() {
    try {
      const res = await get<QrResponse>('/whatsapp/qr')
      if (res.conectado) {
        setStatus('conectado')
        setQr(null)
        pararPolling()
      } else if (res.qr) {
        setQr(res.qr)
      }
    } catch {}
  }

  function iniciarPolling() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(async () => {
      await buscarQr()
      const res = await get<StatusResponse>('/whatsapp/status')
      setStatus(res.status)
      if (res.status === 'conectado') pararPolling()
    }, 3000)
  }

  function pararPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  async function iniciarSessao() {
    setIniciando(true)
    try {
      await post('/whatsapp/iniciar', {})
      setStatus('aguardando_qr')
      setTimeout(() => {
        buscarQr()
        iniciarPolling()
      }, 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setIniciando(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">WhatsApp</h1>
        <p className="page-subtitle">Conecte seu WhatsApp para enviar mensagens reais</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">
            {status === 'conectado' ? '✅' : status === 'aguardando_qr' ? '⏳' : '❌'}
          </div>
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {status === 'conectado' ? 'Conectado' : status === 'aguardando_qr' ? 'Aguardando QR' : 'Desconectado'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📡</div>
          <div className="stat-label">Modo</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {process.env.NODE_ENV === 'production' ? 'Real' : 'Configurável'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Conexão WhatsApp</h2>
          <span className={`badge badge-${status === 'conectado' ? 'enviado' : status === 'aguardando_qr' ? 'agendada' : 'erro'}`}>
            {status === 'conectado' ? 'Online' : status === 'aguardando_qr' ? 'Aguardando' : 'Offline'}
          </span>
        </div>

        {status === 'desconectado' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📱</div>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 15 }}>
              Clique em <strong>Conectar WhatsApp</strong> para gerar o QR Code.<br />
              Você vai escanear pelo seu celular.
            </p>
            <button
              className="btn btn-primary"
              onClick={iniciarSessao}
              disabled={iniciando}
              style={{ fontSize: 16, padding: '14px 32px' }}
            >
              {iniciando ? '⏳ Iniciando...' : '📲 Conectar WhatsApp'}
            </button>
          </div>
        )}

        {status === 'aguardando_qr' && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>
              Abra o WhatsApp no celular → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → Escaneie o QR abaixo
            </p>

            {qr ? (
              <div style={{ display: 'inline-block', padding: 16, background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <img src={qr} alt="QR Code WhatsApp" style={{ width: 240, height: 240, display: 'block' }} />
              </div>
            ) : (
              <div style={{ padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                Gerando QR Code...
              </div>
            )}

            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 16 }}>
              O QR Code atualiza automaticamente a cada 3 segundos
            </p>
          </div>
        )}

        {status === 'conectado' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h3 style={{ color: '#15803d', fontSize: 20, marginBottom: 8 }}>WhatsApp Conectado!</h3>
            <p style={{ color: '#64748b', fontSize: 15 }}>
              As mensagens serão enviadas pelo seu WhatsApp.<br />
              Você pode criar campanhas e fluxos normalmente.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Como usar</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { n: '1', t: 'Defina WHATSAPP_MOCK=false no .env do backend', d: 'Por padrão o sistema está em modo mock (simulação). Para enviar mensagens reais, altere essa variável e reinicie o servidor.' },
            { n: '2', t: 'Clique em "Conectar WhatsApp"', d: 'O sistema vai abrir uma sessão e gerar o QR Code para você escanear.' },
            { n: '3', t: 'Escaneie com seu celular', d: 'WhatsApp → Dispositivos conectados → Conectar dispositivo → Aponte para o QR Code.' },
            { n: '4', t: 'Crie uma campanha ou fluxo', d: 'Depois de conectado, todos os envios sairão pelo seu WhatsApp automaticamente.' },
          ].map(item => (
            <div key={item.n} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #22d3ee)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {item.n}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{item.t}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{item.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
