import { useState, useEffect } from 'react'
import { get, post } from '../services/api'

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

  async function criarCampanha(e: React.FormEvent) {
    e.preventDefault()
    try {
      await post('/campanhas', {
        ...form,
        delayMin: Number(form.delayMin),
        delayMax: Number(form.delayMax),
        listaId: Number(form.listaId),
      })
      setMsg({ tipo: 'success', texto: 'Campanha criada e mensagens agendadas!' })
      setForm({ nome: '', mensagem: '', delayMin: 5, delayMax: 15, listaId: '' })
      carregarDados()
    } catch (err: unknown) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'Erro ao criar campanha' })
    }
  }

  return (
    <div>
      <h1 className="page-title">Campanhas</h1>

      {msg && (
        <div className={`alert alert-${msg.tipo}`} onClick={() => setMsg(null)}>
          {msg.texto}
        </div>
      )}

      <div className="card">
        <h2>Nova Campanha</h2>
        <form onSubmit={criarCampanha}>
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
            <label>Mensagem</label>
            <textarea
              rows={4}
              value={form.mensagem}
              onChange={e => setForm({ ...form, mensagem: e.target.value })}
              placeholder="Olá {nome}, temos uma oferta especial para você!"
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
          <button type="submit" className="btn btn-primary">Criar e Agendar</button>
        </form>
      </div>

      <div className="card">
        <h2>Campanhas</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Mensagem</th>
              <th>Delay</th>
              <th>Status</th>
              <th>Criada em</th>
            </tr>
          </thead>
          <tbody>
            {campanhas.map(c => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.mensagem}
                </td>
                <td>{c.delayMin}s – {c.delayMax}s</td>
                <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                <td>{new Date(c.createdAt).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
            {campanhas.length === 0 && (
              <tr><td colSpan={5} style={{ color: '#999', textAlign: 'center' }}>Nenhuma campanha criada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
