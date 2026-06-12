import { useState, useEffect } from 'react'
import { get, post, del } from '../services/api'

interface Lista {
  id: number
  nome: string
}

interface Campanha {
  id: number
  nome: string
  mensagem: string
  delayMin: number
  delayMax: number
  status: string
  createdAt: string
}

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [form, setForm] = useState({
    nome: '',
    mensagem: '',
    delayMin: 5,
    delayMax: 15,
    listaId: '',
  })
  const [msg, setMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const [c, l] = await Promise.all([
      get<Campanha[]>('/campanhas'),
      get<Lista[]>('/contatos/listas'),
    ])
    setCampanhas(c)
    setListas(l)
  }

  async function removerCampanha(id: number) {
    if (!confirm('Remover esta campanha e todas as mensagens agendadas?')) return
    await del(`/campanhas/${id}`)
    setCampanhas(prev => prev.filter(c => c.id !== id))
  }

  async function criarCampanha(e: React.FormEvent) {
    e.preventDefault()
    try {
      await post('/campanhas', {
        ...form,
        delayMin: Number(form.delayMin),
        delayMax: Number(form.delayMax),
        listaId: Number(form.listaId),
      })
      setMsg({ tipo: 'success', texto: '✅ Campanha criada e mensagens agendadas!' })
      setForm({ nome: '', mensagem: '', delayMin: 5, delayMax: 15, listaId: '' })
      carregarDados()
    } catch (err: unknown) {
      setMsg({ tipo: 'error', texto: '❌ ' + (err instanceof Error ? err.message : 'Erro ao criar campanha') })
    }
  }

  const total = campanhas.length
  const agendadas = campanhas.filter(c => c.status === 'agendada').length
  const pendentes = campanhas.filter(c => c.status === 'pendente').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Campanhas</h1>
        <p className="page-subtitle">Envie mensagens em massa com delay aleatório entre cada disparo</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📣</div>
          <div className="stat-label">Total de Campanhas</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🕐</div>
          <div className="stat-label">Agendadas</div>
          <div className="stat-value">{agendadas}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-label">Pendentes</div>
          <div className="stat-value">{pendentes}</div>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.tipo}`} onClick={() => setMsg(null)}>
          {msg.texto}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Nova Campanha</h2>
        </div>
        <form onSubmit={criarCampanha}>
          <div className="form-row">
            <div className="form-group">
              <label>Nome da campanha</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Promoção Junho"
                required
              />
            </div>
            <div className="form-group">
              <label>Lista de contatos</label>
              <select
                value={form.listaId}
                onChange={e => setForm({ ...form, listaId: e.target.value })}
                required
              >
                <option value="">-- selecione --</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Mensagem</label>
            <textarea
              rows={4}
              value={form.mensagem}
              onChange={e => setForm({ ...form, mensagem: e.target.value })}
              placeholder="Olá! Temos uma oferta especial para você..."
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Delay mínimo (segundos)</label>
              <input
                type="number"
                min={1}
                value={form.delayMin}
                onChange={e => setForm({ ...form, delayMin: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label>Delay máximo (segundos)</label>
              <input
                type="number"
                min={1}
                value={form.delayMax}
                onChange={e => setForm({ ...form, delayMax: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">🚀 Criar e Agendar</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Campanhas criadas</h2>
          <span style={{ fontSize: 13, color: '#64748b' }}>{campanhas.length} campanha(s)</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Mensagem</th>
                <th>Delay</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {campanhas.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.nome}</strong></td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>
                    {c.mensagem}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{c.delayMin}s – {c.delayMax}s</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td style={{ color: '#64748b', fontSize: 13 }}>{new Date(c.createdAt).toLocaleString('pt-BR')}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => removerCampanha(c.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {campanhas.length === 0 && (
                <tr className="empty-row"><td colSpan={6}>Nenhuma campanha criada ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
