import factory from './utils/factory'
import postRouter from './router/post.router'
import mainRouter from './router/main.router'
const app = factory.createApp()

app.route('/v1', mainRouter)

export default {
  fetch: app.fetch,
  idleTimeout: 255,
  port: 3000,
  development: process.env.ENVIRONMENT === 'dev',
}
