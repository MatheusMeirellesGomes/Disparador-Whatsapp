import { useState, useEffect } from 'react'
import { get, post, postForm } from '../services/api'

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
    setMsg({ tipo: 'success', texto: 'Lista criada com sucesso!' })
  }

  async function importarCSV(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo || !listaSelecionada) return
    const form = new FormData()
    form.append('arquivo', arquivo)
    const res = await postForm<{ importados: number }>(
      `/contatos/listas/${listaSelecionada}/importar`,
      form
    )
    setMsg({ tipo: 'success', texto: `${res.importados} contatos importados!` })
    setArquivo(null)
    carregarListas()
  }

  async function verContatos(listaId: number) {
    setListaSelecionada(listaId)
    const data = await get<Contato[]>(`/contatos/listas/${listaId}/contatos`)
    setContatos(data)
  }

  return (
    <div>
      <h1 className="page-title">Contatos</h1>

      {msg && (
        <div className={`alert alert-${msg.tipo}`} onClick={() => setMsg(null)}>
          {msg.texto}
        </div>
      )}

      <div className="card">
        <h2>Nova Lista</h2>
        <form onSubmit={criarLista}>
          <div className="form-row">
            <div className="form-group">
              <label>Nome da lista</label>
              <input
                type="text"
                value={nomeLista}
                onChange={e => setNomeLista(e.target.value)}
                placeholder="Ex: Leads Maio"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Criar Lista</button>
        </form>
      </div>

      <div className="card">
        <h2>Importar CSV</h2>
        <p style={{ fontSize: 13, color: '#777', marginBottom: 12 }}>
          O arquivo deve ter colunas: <strong>nome,telefone</strong>
        </p>
        <form onSubmit={importarCSV}>
          <div className="form-group">
            <label>Selecionar lista</label>
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
          <div className="form-group">
            <label>Arquivo CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={e => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="submit" className="btn btn-primary">Importar</button>
        </form>
      </div>

      <div className="card">
        <h2>Listas</h2>
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
                <td>{lista.nome}</td>
                <td>{lista._count.contatos}</td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => verContatos(lista.id)}
                  >
                    Ver contatos
                  </button>
                </td>
              </tr>
            ))}
            {listas.length === 0 && (
              <tr><td colSpan={3} style={{ color: '#999', textAlign: 'center' }}>Nenhuma lista cadastrada</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {contatos.length > 0 && (
        <div className="card">
          <h2>Contatos da lista</h2>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
              </tr>
            </thead>
            <tbody>
              {contatos.map(c => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.telefone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
