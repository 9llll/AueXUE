export interface CloudflareEnv {
  DB: D1Database
  BUCKET: R2Bucket
  WEBDAV_PASSWORD?: string
  ADMIN_USERNAME?: string
  ADMIN_PASSWORD?: string
  ADMIN_API_TOKEN?: string
  SITE_URL?: string
}
