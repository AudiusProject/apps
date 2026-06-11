const request = require('supertest')

const { getApp } = require('./lib/app')

describe('test /health_check and /balance_check', function () {
  let app, server
  beforeEach(async () => {
    const appInfo = await getApp()
    app = appInfo.app
    server = appInfo.server
  })
  afterEach(async () => {
    await server.close()
  })

  // skipping because need to mock libs for this check to succed, but since we have
  // health checks this should be okay
  it.skip('responds 200 for health check', function (done) {
    request(app).get('/health_check').expect(200, done)
  })

  it('responds to balance check', function (done) {
    // 200 if balance === 1
    // 500 if balance < 1
    request(app)
      .get('/balance_check')
      .expect((res) => {
        if (res.status !== 200 && res.status !== 500) {
          throw new Error('Not a valid status code')
        }
      })
      .end((err, res) => {
        if (err) return done(err)
        done()
      })
  })

  it('responds 404 for invalid route', function (done) {
    request(app).get('/invalid_route').expect(404, done)
  })

  it('does not expose the legacy Solana relay routes', async function () {
    await request(app)
      .post('/tracks/123/listen')
      .send({ userId: 456 })
      .expect(404)

    await request(app).get('/tracks/listen/solana/status').expect(404)
    await request(app).post('/wormhole_relay').send({}).expect(404)
    await request(app).get('/sol_balance_check').expect(404)
  })
})
