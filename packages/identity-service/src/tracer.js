const { trace } = require('@opentelemetry/api')

const { registerInstrumentations } = require('@opentelemetry/instrumentation')
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
const { Resource } = require('@opentelemetry/resources')
const {
  SemanticResourceAttributes: ResourceAttributesSC
} = require('@opentelemetry/semantic-conventions')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const {
  ExpressInstrumentation
} = require('@opentelemetry/instrumentation-express')
const {
  BunyanInstrumentation
} = require('@opentelemetry/instrumentation-bunyan')

const SERVICE_NAME = 'identity-service'

const setupTracing = () => {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [ResourceAttributesSC.SERVICE_NAME]: SERVICE_NAME
    })
  })
  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      new HttpInstrumentation(),

      new ExpressInstrumentation(),

      new BunyanInstrumentation({
        logHook: (span, record) => {
          record['resource.span'] = span
          record['resource.service.name'] =
            provider.resource.attributes['service.name']
        }
      })
    ]
  })

  provider.register()
}

/**
 * A Tracer creates spans containing more information about what is happening
 * for a given operation, such as a request in a service.
 * Tracers are created from Tracer Providers.
 *
 * This function fetches the tracer from the application context
 * @returns {Tracer} the tracer for content node
 */
const getTracer = () => {
  return trace.getTracer(SERVICE_NAME)
}

module.exports = { setupTracing, getTracer }
