/*
    WIP: This module serves as an API to the frigate.
*/


import Fastify from 'fastify';
import config from 'config';

const fastify = Fastify({
    logger: true
})


const paramsJsonSchema = {
    type: 'object',
    properties: {
        par1: { type: 'string' },
        par2: { type: 'number' }
    }
}

const schema = {
    params:paramsJsonSchema,
}


fastify.get('/getRate',{schema}, async (request, reply) => {
    reply.send({ params: request.query })
},)

fastify.setErrorHandler(function (error, request, reply) {
    request.log.error(error, `This error has status code ${error.statusCode}`)
    reply.status(error.statusCode!).send(error)
  })


try {
    fastify.listen({ port: config.get("server.port"), host: config.get("server.host") })
} catch (err) {
    fastify.log.error(err)
    process.exit(1)
}