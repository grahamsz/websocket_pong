export { Pong } from './pong.mjs'

const DEBUG = false

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env)
    } catch (e) {
      return new Response(e.message)
    }
  },
}

async function handleRequest(request, env) {
  const url = new URL(request.url)

  let id = env.PONG.idFromName("game1")
  let obj = env.PONG.get(id)
  let resp = await obj.fetch(request)
  return resp
}