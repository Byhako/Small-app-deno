import { Hono } from "https://deno.land/x/hono@v3.11.9/mod.ts"
import { cors, serveStatic } from "https://deno.land/x/hono@v3.11.9/middleware.ts"
import { streamSSE } from "https://deno.land/x/hono@v3.9.1/helper.ts"

const app = new Hono()
const db = await Deno.openKv()
let i = 0

app.use(cors())
// app.get('/', (c) => c.text('Hola Ruben'))
app.get('/', serveStatic({ path: './index.html' }))

app.post('/visits', async (ctx) => {
  const { city, country, flag } = await ctx.req.json()
  await db.atomic()
    .set(['lastVisit'], { city, country, flag })
    .sum(['visits'], 1n)
    .commit()
  return ctx.json({ message: 'ok' })
})

app.get('/visits', (ctx) => {
  return streamSSE(ctx, async (stream) => {
    const watcher = await db.watch([['lastVisit']])

    for await (const entry of watcher) {
      const { value } = entry[0]
      if (value) {
      await stream.writeSSE({ data: JSON.stringify(value), event: 'update', id: String(i++)})
      }
    }
  })
})

// app.get('/counter', (ctx) => {
//   return streamSSE(ctx, async (stream) => {
//     const watcher = await db.watch([['visits']])

//     for await (const entry of watcher) {
//       const { value } = entry[0]
//       if (value) {
//       await stream.writeSSE({ data: value.toString(), event: 'update', id: String(i++)})
//       }
//     }
//     // while (true) {
//     //   const { value } = await db.get(['visits'])
//     //   await stream.writeSSE({ data: Number(value).toString(), event: 'update', id: String(i++)})
//     //   await stream.sleep(1000)
//     // }
//   })
// })

// curl -X POST http://localhost:8000/counter

Deno.serve(app.fetch)
