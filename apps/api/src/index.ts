import factory from './utils/factory'
import postRouter from './routes/post.routes'
const app = factory.createApp()

app.get('/', (c) => {
  return c.text('Hello Hono!')
}).route('/post', postRouter)

export default {
  fetch: app.fetch,
  idleTimeout: 255,
  port: 3000,
  development: process.env.ENVIRONMENT === 'dev',
}
