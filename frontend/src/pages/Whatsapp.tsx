import { useState, useEffect, useRef } from 'react'
import { get, post } from '../services/api'

interface StatusResponse {
  status: 'desconectado' | 'aguardando_qr' | 'conectado'
}

interface QrResponse {
  conectado: boolean
  qr: string | null
  status: string
}

type Tela = 'desconectado' | 'aguardando_qr' | 'conectado'

export default function Whatsapp() {
  const [tela, setTela] = useState<Tela>('desconectado')
  const [qr, setQr] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [tentativas, setTentativas] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ao montar, verifica se já havia sessão ativa
  useEffect(() => {
    verificarStatusInicial()
    return () => pararPolling()
  }, [])

  async function verificarStatusInicial() {
    try {
      const res = await get<StatusResponse>('/whatsapp/status')
      if (res.status === 'conectado') {
        setTela('conectado')
      } else if (res.status === 'aguardando_qr') {
        setTela('aguardando_qr')
        iniciarPolling()
      }
      // se desconectado, mantém tela inicial
    } catch {}
  }

  function iniciarPolling() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(async () => {
      try {
        const res = await get<QrResponse>('/whatsapp/qr')

        if (res.conectado) {
          setTela('conectado')
          setQr(null)
          pararPolling()
          return
        }

        if (res.qr) {
          setQr(res.qr)
        }

        setTentativas(t => t + 1)
      } catch {}
    }, 2000)
  }

  function pararPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function cancelar() {
    pararPolling()
    setTela('desconectado')
    setQr(null)
    setTentativas(0)
  }

  async function conectar() {
    setIniciando(true)
    setTentativas(0)
    try {
      await post('/whatsapp/iniciar', {})
      setTela('aguardando_qr')
      // dá um tempo para o worker processar o flag e iniciar o WPPConnect
      setTimeout(() => iniciarPolling(), 5000)
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
            {tela === 'conectado' ? '✅' : tela === 'aguardando_qr' ? '⏳' : '❌'}
          </div>
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {tela === 'conectado' ? 'Conectado' : tela === 'aguardando_qr' ? 'Aguardando QR' : 'Desconectado'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-label">Verificações</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{tentativas}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Conexão WhatsApp</h2>
          <span className={`badge badge-${tela === 'conectado' ? 'enviado' : tela === 'aguardando_qr' ? 'agendada' : 'erro'}`}>
            {tela === 'conectado' ? 'Online' : tela === 'aguardando_qr' ? 'Aguardando' : 'Offline'}
          </span>
        </div>

        {/* ── Desconectado ── */}
        {tela === 'desconectado' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📱</div>
            <p style={{ color: '#64748b', marginBottom: 8, fontSize: 15 }}>
              Clique em <strong>Conectar WhatsApp</strong> para gerar o QR Code.
            </p>
            <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 13 }}>
              O WPPConnect pode levar até 60 segundos para iniciar o navegador interno.
            </p>
            <button
              className="btn btn-primary"
              onClick={conectar}
              disabled={iniciando}
              style={{ fontSize: 16, padding: '14px 32px' }}
            >
              {iniciando ? '⏳ Aguarde...' : '📲 Conectar WhatsApp'}
            </button>
          </div>
        )}

        {/* ── Aguardando QR ── */}
        {tela === 'aguardando_qr' && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            {qr ? (
              <>
                <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>
                  Abra o WhatsApp no celular →{' '}
                  <strong>Dispositivos conectados</strong> →{' '}
                  <strong>Conectar dispositivo</strong> → Escaneie o QR abaixo
                </p>
                <div style={{
                  display: 'inline-block', padding: 16, background: '#fff',
                  borderRadius: 12, border: '2px solid #22d3ee',
                  boxShadow: '0 4px 20px rgba(34,211,238,0.15)'
                }}>
                  <img
                    src={qr}
                    alt="QR Code WhatsApp"
                    style={{ width: 260, height: 260, display: 'block' }}
                  />
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 14 }}>
                  Atualizando a cada 2 segundos · Verificação #{tentativas}
                </p>
              </>
            ) : (
              <div style={{ padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <p style={{ color: '#0f172a', fontWeight: 600, marginBottom: 8 }}>
                  Iniciando o WhatsApp...
                </p>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>
                  O navegador interno está sendo carregado. Isso pode levar até 60 segundos na primeira vez.
                </p>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>
                  Verificação #{tentativas} — aguarde o QR aparecer abaixo
                </p>

                {/* barra de progresso animada */}
                <div style={{ margin: '24px auto', maxWidth: 300, height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: '60%',
                    background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)',
                    borderRadius: 4,
                    animation: 'slide 1.5s ease-in-out infinite',
                  }} />
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={cancelar}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Conectado ── */}
        {tela === 'conectado' && (
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
            { n: '1', t: 'Defina WHATSAPP_MOCK=false no .env do backend', d: 'Por padrão o sistema simula os envios. Para mensagens reais, altere essa variável e reinicie o servidor e o worker.' },
            { n: '2', t: 'Clique em "Conectar WhatsApp"', d: 'O worker vai iniciar o navegador interno e gerar o QR Code. Pode levar até 60 segundos.' },
            { n: '3', t: 'Escaneie com seu celular', d: 'WhatsApp → 3 pontos → Dispositivos conectados → Conectar dispositivo → Aponte para o QR Code.' },
            { n: '4', t: 'Crie campanhas e fluxos', d: 'Depois de conectado, todos os envios sairão pelo seu WhatsApp automaticamente.' },
          ].map(item => (
            <div key={item.n} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0ea5e9, #22d3ee)',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0
              }}>
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

      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  )
}
