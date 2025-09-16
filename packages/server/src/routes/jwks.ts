import { exportPublicJwks } from '@keyloom/core/jwt'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getKeystoreManager } from '../keystore'

/**
 * Register JWKS (JSON Web Key Set) routes
 */
export function registerJwksRoutes(app: FastifyInstance) {
  // GET /.well-known/jwks.json - Public key endpoint
  app.get('/.well-known/jwks.json', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const keystoreManager = getKeystoreManager()
      const keystore = keystoreManager.getKeystore()
      const jwks = exportPublicJwks(keystore)

      // Set caching headers
      reply.header('Cache-Control', 'public, max-age=300') // 5 minutes
      reply.header('Content-Type', 'application/json')

      // Add CORS headers for cross-origin requests
      reply.header('Access-Control-Allow-Origin', '*')
      reply.header('Access-Control-Allow-Methods', 'GET')
      reply.header('Access-Control-Allow-Headers', 'Content-Type')

      return jwks
    } catch (error) {
      console.error('Error serving JWKS:', error)
      return reply.code(500).send({
        error: 'internal_server_error',
        message: 'Failed to retrieve public keys',
      })
    }
  })

  // GET /v1/auth/jwks - Alternative endpoint (for consistency with other auth endpoints)
  app.get('/v1/auth/jwks', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const keystoreManager = getKeystoreManager()
      const keystore = keystoreManager.getKeystore()
      const jwks = exportPublicJwks(keystore)

      reply.header('Cache-Control', 'public, max-age=300')
      reply.header('Content-Type', 'application/json')

      return jwks
    } catch (error) {
      console.error('Error serving JWKS:', error)
      return reply.code(500).send({
        error: 'internal_server_error',
        message: 'Failed to retrieve public keys',
      })
    }
  })

  // GET /v1/auth/keystore/stats - Keystore statistics (for admin/debugging)
  app.get('/v1/auth/keystore/stats', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const keystoreManager = getKeystoreManager()
      const stats = keystoreManager.getStats()

      return {
        ...stats,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error getting keystore stats:', error)
      return reply.code(500).send({
        error: 'internal_server_error',
        message: 'Failed to retrieve keystore statistics',
      })
    }
  })

  // POST /v1/auth/keystore/rotate - Force key rotation (for admin)
  app.post('/v1/auth/keystore/rotate', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const keystoreManager = getKeystoreManager()
      await keystoreManager.forceRotate()
      const stats = keystoreManager.getStats()

      return {
        message: 'Keystore rotated successfully',
        newActiveKey: stats.activeKeyId,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error rotating keystore:', error)
      return reply.code(500).send({
        error: 'internal_server_error',
        message: 'Failed to rotate keystore',
      })
    }
  })
}

/**
 * Middleware to handle JWKS preflight requests
 */
export function registerJwksCors(app: FastifyInstance) {
  // Handle preflight requests for JWKS endpoint
  app.options('/.well-known/jwks.json', async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    reply.header('Access-Control-Max-Age', '86400') // 24 hours
    return reply.code(204).send()
  })
}

/**
 * Register all JWKS-related routes and middleware
 */
export function setupJwks(app: FastifyInstance) {
  registerJwksCors(app)
  registerJwksRoutes(app)
}
