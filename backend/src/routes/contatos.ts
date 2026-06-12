import { Router, Request, Response } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()
const upload = multer({ dest: 'uploads/' })

// Criar lista
router.post('/listas', async (req: Request, res: Response) => {
  try {
    const { nome } = req.body
    if (!nome) {
      res.status(400).json({ erro: 'nome é obrigatório' })
      return
    }
    const lista = await prisma.lista.create({ data: { nome } })
    res.status(201).json(lista)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Listar listas
router.get('/listas', async (_req: Request, res: Response) => {
  try {
    const listas = await prisma.lista.findMany({ include: { _count: { select: { contatos: true } } } })
    res.json(listas)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Upload CSV de contatos
router.post('/listas/:listaId/importar', upload.single('arquivo'), async (req: Request, res: Response) => {
  const listaId = parseInt(req.params.listaId)

  if (!req.file) {
    res.status(400).json({ erro: 'Arquivo CSV obrigatório' })
    return
  }

  const contatos: { nome: string; telefone: string }[] = []

  fs.createReadStream(req.file.path)
    .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
    .on('data', (row: { nome: string; telefone: string }) => {
      if (row.nome && row.telefone) {
        contatos.push({ nome: row.nome, telefone: row.telefone })
      }
    })
    .on('end', async () => {
      try {
        fs.unlinkSync(req.file!.path)
        await prisma.contato.createMany({
          data: contatos.map((c) => ({ ...c, listaId })),
        })
        res.status(201).json({ importados: contatos.length })
      } catch (err) {
        res.status(500).json({ erro: String(err) })
      }
    })
    .on('error', (err) => {
      res.status(500).json({ erro: err.message })
    })
})

// Adicionar contato manualmente
router.post('/listas/:listaId/contatos', async (req: Request, res: Response) => {
  try {
    const listaId = parseInt(req.params.listaId)
    const { nome, telefone } = req.body
    if (!nome || !telefone) {
      res.status(400).json({ erro: 'Nome e telefone são obrigatórios' })
      return
    }
    const contato = await prisma.contato.create({ data: { nome, telefone, listaId } })
    res.status(201).json(contato)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Listar contatos de uma lista
router.get('/listas/:listaId/contatos', async (req: Request, res: Response) => {
  try {
    const listaId = parseInt(req.params.listaId)
    const contatos = await prisma.contato.findMany({ where: { listaId } })
    res.json(contatos)
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Remover contato
router.delete('/contatos/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    await prisma.filaEnvio.deleteMany({ where: { contatoId: id } })
    await prisma.execucaoFluxo.deleteMany({ where: { contatoId: id } })
    await prisma.contato.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

// Remover lista (e todos os contatos dela)
router.delete('/listas/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const contatos = await prisma.contato.findMany({ where: { listaId: id }, select: { id: true } })
    const ids = contatos.map(c => c.id)
    await prisma.filaEnvio.deleteMany({ where: { contatoId: { in: ids } } })
    await prisma.execucaoFluxo.deleteMany({ where: { contatoId: { in: ids } } })
    await prisma.contato.deleteMany({ where: { listaId: id } })
    await prisma.lista.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: String(err) })
  }
})

export default router
