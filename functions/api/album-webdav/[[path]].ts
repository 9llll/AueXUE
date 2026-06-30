import { handleAlbumWebdavHttp } from '../../../server/albumWebdavHttp'
import type { CloudflareEnv } from '../../../types/env'

export async function onRequest(context: { request: Request, env: CloudflareEnv }) {
  return handleAlbumWebdavHttp(context.request, {
    env: context.env,
    runtimeEnv: {
      WEBDAV_PASSWORD: context.env.WEBDAV_PASSWORD,
    },
  })
}
