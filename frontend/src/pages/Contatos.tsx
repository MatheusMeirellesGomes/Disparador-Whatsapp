import { useState, useEffect } from 'react'
import { get, post, postForm, del } from '../services/api'

interface Lista {
  id: number
  nome: string
  _count: { contatos: number }
}

interface Contato {
  id: number
  nome: string
  telefone: string
}

export default function Contatos() {
  const [listas, setListas] = useState<Lista[]>([])
  const [nomeLista, setNomeLista] = useState('')
  const [listaSelecionada, setListaSelecionada] = useState<number | null>(null)
  const [contatos, setContatos] = useState<Contato[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [nomeContato, setNomeContato] = useState('')
  const [telefoneContato, setTelefoneContato] = useState('')
  const [listaManual, setListaManual] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    carregarListas()
  }, [])

  async function carregarListas() {
    const data = await get<Lista[]>('/contatos/listas')
    setListas(data)
  }

  async function criarLista(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeLista.trim()) return
    await post('/contatos/listas', { nome: nomeLista })
    setNomeLista('')
    carregarListas()
    setMsg({ tipo: 'success', texto: '✅ Lista criada com sucesso!' })
  }

  async function adicionarManual(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeContato.trim() || !telefoneContato.trim() || !listaManual) return
    try {
      await post(`/contatos/listas/${listaManual}/contatos`, {
        nome: nomeContato,
        telefone: telefoneContato,
      })
      setNomeContato('')
      setTelefoneContato('')
      setMsg({ tipo: 'success', texto: '✅ Contato adicionado!' })
      carregarListas()
      if (listaSelecionada === listaManual) verContatos(listaManual)
    } catch {
      setMsg({ tipo: 'error', texto: '❌ Erro ao adicionar contato' })
    }
  }

  async function importarCSV(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo || !listaSelecionada) return
    const form = new FormData()
    form.append('arquivo', arquivo)
    try {
      const res = await postForm<{ importados: number }>(
        `/contatos/listas/${listaSelecionada}/importar`,
        form
      )
      setMsg({ tipo: 'success', texto: `✅ ${res.importados} contatos importados!` })
      setArquivo(null)
      carregarListas()
      verContatos(listaSelecionada)
    } catch {
      setMsg({ tipo: 'error', texto: '❌ Erro ao importar CSV. Verifique o formato do arquivo.' })
    }
  }

  async function removerContato(id: number) {
    if (!confirm('Remover este contato?')) return
    await del(`/contatos/contatos/${id}`)
    setContatos(prev => prev.filter(c => c.id !== id))
    carregarListas()
  }

  async function removerLista(id: number) {
    if (!confirm('Remover esta lista e todos os seus contatos?')) return
    await del(`/contatos/listas/${id}`)
    setListas(prev => prev.filter(l => l.id !== id))
    if (listaSelecionada === id) {
      setListaSelecionada(null)
      setContatos([])
    }
  }

  async function verContatos(listaId: number) {
    setListaSelecionada(listaId)
    const data = await get<Contato[]>(`/contatos/listas/${listaId}/contatos`)
    setContatos(data)
  }

  const totalContatos = listas.reduce((acc, l) => acc + l._count.contatos, 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Contatos</h1>
        <p className="page-subtitle">Gerencie suas listas e importe contatos via CSV</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-label">Total de Listas</div>
          <div className="stat-value">{listas.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-label">Total de Contatos</div>
          <div className="stat-value">{totalContatos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-label">Visualizando</div>
          <div className="stat-value">{contatos.length > 0 ? contatos.length : '—'}</div>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.tipo}`} onClick={() => setMsg(null)}>
          {msg.texto}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h2>Nova Lista</h2>
          </div>
          <form onSubmit={criarLista}>
            <div className="form-group">
              <label>Nome da lista</label>
              <input
                type="text"
                value={nomeLista}
                onChange={e => setNomeLista(e.target.value)}
                placeholder="Ex: Leads Maio"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Criar Lista</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Adicionar Contato</h2>
          </div>
          <form onSubmit={adicionarManual}>
            <div className="form-group">
              <label>Lista</label>
              <select
                value={listaManual ?? ''}
                onChange={e => setListaManual(Number(e.target.value))}
              >
                <option value="">-- selecione --</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                value={nomeContato}
                onChange={e => setNomeContato(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="form-group">
              <label>Telefone (com DDI e DDD)</label>
              <input
                type="text"
                value={telefoneContato}
                onChange={e => setTelefoneContato(e.target.value)}
                placeholder="Ex: 5531999999999"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">➕ Adicionar</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Importar CSV</h2>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          O arquivo deve ter colunas: <strong>nome, telefone</strong> — salve como texto simples (.csv ou .txt)
        </p>
        <form onSubmit={importarCSV} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Lista</label>
            <select
              value={listaSelecionada ?? ''}
              onChange={e => setListaSelecionada(Number(e.target.value))}
            >
              <option value="">-- selecione --</option>
              {listas.map(l => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Arquivo</label>
            <input
              type="file"
              onChange={e => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div />
          <button type="submit" className="btn btn-primary">📤 Importar</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Listas cadastradas</h2>
          <span style={{ fontSize: 13, color: '#64748b' }}>{listas.length} lista(s)</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contatos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listas.map(lista => (
                <tr key={lista.id}>
                  <td><strong>{lista.nome}</strong></td>
                  <td>{lista._count.contatos} contato(s)</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => verContatos(lista.id)}
                    >
                      👁 Ver
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removerLista(lista.id)}
                    >
                      🗑 Remover
                    </button>
                  </td>
                </tr>
              ))}
              {listas.length === 0 && (
                <tr className="empty-row"><td colSpan={3}>Nenhuma lista cadastrada ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {contatos.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Contatos da lista</h2>
            <span style={{ fontSize: 13, color: '#64748b' }}>{contatos.length} contato(s)</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {contatos.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                    <td><strong>{c.nome}</strong></td>
                    <td>{c.telefone}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removerContato(c.id)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
