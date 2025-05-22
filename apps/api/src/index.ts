import factory from './utils/factory'
import postRouter from './routes/post.routes'
const app = factory.createApp()

app.get('/', (c) => {
  return c.text('Hello Hono!')
}).route('/post', postRouter)

export default app
