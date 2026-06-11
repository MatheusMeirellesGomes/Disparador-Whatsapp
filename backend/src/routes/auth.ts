import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'secret'

router.post('/register', async (req: Request, res: Response) => {
  const { email, senha } = req.body

  if (!email || !senha) {
    res.status(400).json({ erro: 'Email e senha obrigatórios' })
    return
  }

  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) {
    res.status(400).json({ erro: 'Email já cadastrado' })
    return
  }

  const hash = await bcrypt.hash(senha, 10)
  const usuario = await prisma.usuario.create({ data: { email, senha: hash } })

  const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '7d' })
  res.status(201).json({ token, email: usuario.email })
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, senha } = req.body

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) {
    res.status(401).json({ erro: 'Email ou senha inválidos' })
    return
  }

  const valido = await bcrypt.compare(senha, usuario.senha)
  if (!valido) {
    res.status(401).json({ erro: 'Email ou senha inválidos' })
    return
  }

  const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, email: usuario.email })
})

export default router
