import { useState } from 'react'
import { post } from '../services/api'

interface Props {
  onLogin: (email: string) => void
}

interface AuthResponse {
  token: string
  email: string
}

export default function Login({ onLogin }: Props) {
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const endpoint = modo === 'login' ? '/auth/login' : '/auth/register'
      const res = await post<AuthResponse>(endpoint, { email, senha })
      localStorage.setItem('token', res.token)
      localStorage.setItem('email', res.email)
      onLogin(res.email)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  function entrarSemLogin() {
    localStorage.setItem('token', 'guest')
    localStorage.setItem('email', 'Visitante')
    onLogin('Visitante')
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-brand">
            <span className="login-brand-icon">📱</span>
            <h1>Disparador<span>WPP</span></h1>
          </div>
          <p className="login-tagline">
            Automatize seus envios de WhatsApp com fluxos inteligentes e campanhas em massa.
          </p>
          <div className="login-features">
            <div className="login-feature">
              <span>✅</span> Importação de contatos via CSV
            </div>
            <div className="login-feature">
              <span>✅</span> Campanhas com delay aleatório
            </div>
            <div className="login-feature">
              <span>✅</span> Fluxos automáticos por contato
            </div>
            <div className="login-feature">
              <span>✅</span> Worker independente do navegador
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <div className="login-tabs">
            <button
              className={`login-tab ${modo === 'login' ? 'active' : ''}`}
              onClick={() => { setModo('login'); setErro('') }}
            >
              Entrar
            </button>
            <button
              className={`login-tab ${modo === 'registro' ? 'active' : ''}`}
              onClick={() => { setModo('registro'); setErro('') }}
            >
              Criar conta
            </button>
          </div>

          <h2 className="login-title">
            {modo === 'login' ? 'Bem-vindo de volta 👋' : 'Crie sua conta 🚀'}
          </h2>
          <p className="login-desc">
            {modo === 'login'
              ? 'Entre com seu email e senha para continuar'
              : 'Preencha os dados para criar sua conta'}
          </p>

          {erro && (
            <div className="login-erro">❌ {erro}</div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="login-field">
              <label>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="login-btn-primary" disabled={loading}>
              {loading ? 'Aguarde...' : modo === 'login' ? '→ Entrar' : '→ Criar conta'}
            </button>
          </form>

          <div className="login-divider">
            <span>ou</span>
          </div>

          <button className="login-btn-guest" onClick={entrarSemLogin}>
            Entrar sem login
          </button>
        </div>
      </div>
    </div>
  )
}
