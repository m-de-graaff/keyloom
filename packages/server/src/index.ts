import { Env } from './env'
import { buildServer } from './routes/auth'

const env = Env.parse(process.env)
const app = buildServer(env)
app.listen({ port: Number(env.PORT), host: '0.0.0.0' }).then(() => {
  // eslint-disable-next-line no-console
  console.log(`[keyloom] server on :${env.PORT}`)
})
