import express from 'express'
import cors, { CorsOptions } from 'cors'
import authRouter from './routes/auth'
import patientsRouter from './routes/patients'
import consultationsRouter from './routes/consultations'
import attachmentsRouter from './routes/attachments'
import labsRouter from './routes/labs'
import usersRouter from './routes/users'
import reportsRouter from './routes/reports'
import securityRouter from './routes/security'
import recordsRouter from './routes/records'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:3000')
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true, 
  optionsSuccessStatus: 204,
}

// --- Body parser ---
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) 

// --- Health ---
app.get('/health', (_req, res) => res.json({ ok: true }))

// --- Rutas ---
app.use('/auth', authRouter)
app.use(['/auth', '/api/auth'], authRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/consultations', consultationsRouter)
app.use('/api/attachments', attachmentsRouter)
app.use('/api/labs', labsRouter)
app.use('/api/users', usersRouter)
app.use(['/reports', '/api/reports'], reportsRouter)
app.use('/api/security', securityRouter)
app.use(['/records','/api/records'], recordsRouter)
const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => {
  console.log(`API on http://localhost:${port}`)
  console.log(`CORS allowlist: ${allowedOrigins.join(', ') || '(vacío)'}`)
})