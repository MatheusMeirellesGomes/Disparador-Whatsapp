import { useState, useEffect } from 'react'
import { get, post, del } from '../services/api'

interface Lista {
  id: number
  nome: string
}

interface Etapa {
  mensagem: string
  delayMinutos: number
  ordem: number
}

interface FluxoEtapa extends Etapa {
  id: number
}

interface Fluxo {
  id: number
  nome: string
  etapas: FluxoEtapa[]
  createdAt: string
}

interface Execucao {
  id: number
  status: string
  etapaAtual: number
  nextExecutionAt: string
  contato: { nome: string; telefone: string }
}

export default function Fluxos() {
  const [fluxos, setFluxos] = useState<Fluxo[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [nomeFluxo, setNomeFluxo] = useState('')
  const [etapas, setEtapas] = useState<Etapa[]>([
    { mensagem: '', delayMinutos: 0, ordem: 0 },
  ])
  const [fluxoSelecionado, setFluxoSelecionado] = useState<number | null>(null)
  const [listaSelecionada, setListaSelecionada] = useState('')
  const [execucoes, setExecucoes] = useState<Execucao[]>([])
  const [msg, setMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const [f, l] = await Promise.all([
      get<Fluxo[]>('/fluxos'),
      get<Lista[]>('/contatos/listas'),
    ])
    setFluxos(f)
    setListas(l)
  }

  function adicionarEtapa() {
    setEtapas(prev => [
      ...prev,
      { mensagem: '', delayMinutos: 2, ordem: prev.length },
    ])
  }

  function removerEtapa(index: number) {
    setEtapas(prev => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, ordem: i })))
  }

  function atualizarEtapa(index: number, campo: keyof Etapa, valor: string | number) {
    setEtapas(prev =>
      prev.map((e, i) => (i === index ? { ...e, [campo]: valor } : e))
    )
  }

  async function criarFluxo(e: React.FormEvent) {
    e.preventDefault()
    try {
      await post('/fluxos', { nome: nomeFluxo, etapas })
      setMsg({ tipo: 'success', texto: '✅ Fluxo criado com sucesso!' })
      setNomeFluxo('')
      setEtapas([{ mensagem: '', delayMinutos: 0, ordem: 0 }])
      carregarDados()
    } catch (err: unknown) {
      setMsg({ tipo: 'error', texto: '❌ ' + (err instanceof Error ? err.message : 'Erro ao criar fluxo') })
    }
  }

  async function iniciarFluxo(e: React.FormEvent) {
    e.preventDefault()
    if (!fluxoSelecionado || !listaSelecionada) return
    try {
      const res = await post<{ iniciados: number }>(`/fluxos/${fluxoSelecionado}/iniciar`, {
        listaId: Number(listaSelecionada),
      })
      setMsg({ tipo: 'success', texto: `✅ ${res.iniciados} contatos adicionados ao fluxo!` })
      verExecucoes(fluxoSelecionado)
    } catch (err: unknown) {
      setMsg({ tipo: 'error', texto: '❌ ' + (err instanceof Error ? err.message : 'Erro ao iniciar fluxo') })
    }
  }

  async function removerFluxo(id: number) {
    if (!confirm('Remover este fluxo e todas as execuções?')) return
    await del(`/fluxos/${id}`)
    setFluxos(prev => prev.filter(f => f.id !== id))
    if (fluxoSelecionado === id) setExecucoes([])
  }

  async function verExecucoes(fluxoId: number) {
    setFluxoSelecionado(fluxoId)
    const data = await get<Execucao[]>(`/fluxos/${fluxoId}/execucoes`)
    setExecucoes(data)
  }

  const ativos = execucoes.filter(e => e.status === 'ativo').length
  const concluidos = execucoes.filter(e => e.status === 'concluido').length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fluxos Automáticos</h1>
        <p className="page-subtitle">Crie sequências de mensagens com intervalos automáticos por contato</p>
      </div>

      {execucoes.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-label">Em execução</div>
            <div className="stat-value">{ativos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Concluídos</div>
            <div className="stat-value">{concluidos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total no fluxo</div>
            <div className="stat-value">{execucoes.length}</div>
          </div>
        </div>
      )}

      {msg && (
        <div className={`alert alert-${msg.tipo}`} onClick={() => setMsg(null)}>
          {msg.texto}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h2>Criar Fluxo</h2>
          </div>
          <form onSubmit={criarFluxo}>
            <div className="form-group">
              <label>Nome do fluxo</label>
              <input
                type="text"
                value={nomeFluxo}
                onChange={e => setNomeFluxo(e.target.value)}
                placeholder="Ex: Sequência de Boas-vindas"
                required
              />
            </div>

            <div className="etapas-lista">
              {etapas.map((etapa, index) => (
                <div className="etapa-item" key={index}>
                  <div className="etapa-numero">
                    {index === 0
                      ? '⚡ Etapa 1 — enviada imediatamente ao entrar no fluxo'
                      : `📨 Etapa ${index + 1}`}
                  </div>
                  <div className="form-group">
                    <label>Mensagem</label>
                    <textarea
                      rows={2}
                      value={etapa.mensagem}
                      onChange={e => atualizarEtapa(index, 'mensagem', e.target.value)}
                      placeholder="Digite a mensagem desta etapa..."
                      required
                    />
                  </div>
                  {index > 0 && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Delay após etapa anterior (minutos)</label>
                        <input
                          type="number"
                          min={0}
                          value={etapa.delayMinutos}
                          onChange={e => atualizarEtapa(index, 'delayMinutos', Number(e.target.value))}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removerEtapa(index)}
                      >
                        🗑 Remover
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={adicionarEtapa}>
                + Adicionar Etapa
              </button>
              <button type="submit" className="btn btn-primary">💾 Salvar Fluxo</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Adicionar Lista ao Fluxo</h2>
          </div>
          <form onSubmit={iniciarFluxo}>
            <div className="form-group">
              <label>Fluxo</label>
              <select
                value={fluxoSelecionado ?? ''}
                onChange={e => setFluxoSelecionado(Number(e.target.value))}
                required
              >
                <option value="">-- selecione --</option>
                {fluxos.map(f => (
                  <option key={f.id} value={f.id}>{f.nome} ({f.etapas.length} etapas)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Lista de contatos</label>
              <select
                value={listaSelecionada}
                onChange={e => setListaSelecionada(e.target.value)}
                required
              >
                <option value="">-- selecione --</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">▶ Iniciar Fluxo</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Fluxos cadastrados</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Etapas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fluxos.map(f => (
                  <tr key={f.id}>
                    <td><strong>{f.nome}</strong></td>
                    <td>{f.etapas.length} etapa(s)</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => verExecucoes(f.id)}
                      >
                        👁 Ver
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removerFluxo(f.id)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
                {fluxos.length === 0 && (
                  <tr className="empty-row"><td colSpan={3}>Nenhum fluxo cadastrado ainda</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {execucoes.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h2>Execuções do fluxo</h2>
            <span style={{ fontSize: 13, color: '#64748b' }}>{execucoes.length} contato(s)</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Telefone</th>
                  <th>Etapa atual</th>
                  <th>Próximo envio</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map(ex => (
                  <tr key={ex.id}>
                    <td><strong>{ex.contato.nome}</strong></td>
                    <td>{ex.contato.telefone}</td>
                    <td>Etapa {ex.etapaAtual + 1}</td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{new Date(ex.nextExecutionAt).toLocaleString('pt-BR')}</td>
                    <td><span className={`badge badge-${ex.status}`}>{ex.status}</span></td>
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
