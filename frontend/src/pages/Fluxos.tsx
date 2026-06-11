import { useState, useEffect } from 'react'
import { get, post } from '../services/api'

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
      { mensagem: '', delayMinutos: 0, ordem: prev.length },
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
      setMsg({ tipo: 'success', texto: 'Fluxo criado com sucesso!' })
      setNomeFluxo('')
      setEtapas([{ mensagem: '', delayMinutos: 0, ordem: 0 }])
      carregarDados()
    } catch (err: unknown) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'Erro ao criar fluxo' })
    }
  }

  async function iniciarFluxo(e: React.FormEvent) {
    e.preventDefault()
    if (!fluxoSelecionado || !listaSelecionada) return
    try {
      const res = await post<{ iniciados: number }>(`/fluxos/${fluxoSelecionado}/iniciar`, {
        listaId: Number(listaSelecionada),
      })
      setMsg({ tipo: 'success', texto: `${res.iniciados} contatos adicionados ao fluxo!` })
      verExecucoes(fluxoSelecionado)
    } catch (err: unknown) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'Erro ao iniciar fluxo' })
    }
  }

  async function verExecucoes(fluxoId: number) {
    setFluxoSelecionado(fluxoId)
    const data = await get<Execucao[]>(`/fluxos/${fluxoId}/execucoes`)
    setExecucoes(data)
  }

  return (
    <div>
      <h1 className="page-title">Fluxos Automáticos</h1>

      {msg && (
        <div className={`alert alert-${msg.tipo}`} onClick={() => setMsg(null)}>
          {msg.texto}
        </div>
      )}

      <div className="card">
        <h2>Criar Fluxo</h2>
        <form onSubmit={criarFluxo}>
          <div className="form-group">
            <label>Nome do fluxo</label>
            <input
              type="text"
              value={nomeFluxo}
              onChange={e => setNomeFluxo(e.target.value)}
              placeholder="Ex: Boas-vindas"
              required
            />
          </div>

          <div className="etapas-lista">
            {etapas.map((etapa, index) => (
              <div className="etapa-item" key={index}>
                <div className="etapa-numero">
                  {index === 0 ? 'Etapa 1 — enviada imediatamente ao entrar no fluxo' : `Etapa ${index + 1}`}
                </div>
                <div className="form-group">
                  <label>Mensagem</label>
                  <textarea
                    rows={2}
                    value={etapa.mensagem}
                    onChange={e => atualizarEtapa(index, 'mensagem', e.target.value)}
                    placeholder="Digite a mensagem..."
                    required
                  />
                </div>
                {index > 0 && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Delay após etapa anterior (minutos)</label>
                      <input
                        type="number"
                        min={0}
                        value={etapa.delayMinutos}
                        onChange={e => atualizarEtapa(index, 'delayMinutos', Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removerEtapa(index)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={adicionarEtapa}>
              + Adicionar Etapa
            </button>
            <button type="submit" className="btn btn-primary">Salvar Fluxo</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Adicionar Lista ao Fluxo</h2>
        <form onSubmit={iniciarFluxo}>
          <div className="form-row">
            <div className="form-group">
              <label>Fluxo</label>
              <select
                value={fluxoSelecionado ?? ''}
                onChange={e => setFluxoSelecionado(Number(e.target.value))}
                required
              >
                <option value="">-- selecione --</option>
                {fluxos.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
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
          </div>
          <button type="submit" className="btn btn-primary">Adicionar ao Fluxo</button>
        </form>
      </div>

      <div className="card">
        <h2>Fluxos cadastrados</h2>
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
                <td>{f.nome}</td>
                <td>{f.etapas.length}</td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => verExecucoes(f.id)}
                  >
                    Ver execuções
                  </button>
                </td>
              </tr>
            ))}
            {fluxos.length === 0 && (
              <tr><td colSpan={3} style={{ color: '#999', textAlign: 'center' }}>Nenhum fluxo cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {execucoes.length > 0 && (
        <div className="card">
          <h2>Execuções do fluxo</h2>
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
                  <td>{ex.contato.nome}</td>
                  <td>{ex.contato.telefone}</td>
                  <td>{ex.etapaAtual + 1}</td>
                  <td>{new Date(ex.nextExecutionAt).toLocaleString('pt-BR')}</td>
                  <td><span className={`badge badge-${ex.status}`}>{ex.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
