import express from 'express'
import dotenv from 'dotenv'
import contatosRoutes from './routes/contatos'
import campanhasRoutes from './routes/campanhas'
import fluxosRoutes from './routes/fluxos'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use('/contatos', contatosRoutes)
app.use('/campanhas', campanhasRoutes)
app.use('/fluxos', fluxosRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
