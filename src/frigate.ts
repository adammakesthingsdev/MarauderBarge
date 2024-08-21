/*
    Primary server logic. Communicates with each dinghy, sends print requests,
    manages queue, and handles communication with client.
*/

import { FrigateServer } from "./frigateserver.js";
import Fastify from "fastify";
import routes from "./components/routes.js";

const server = new FrigateServer();

const fastify = Fastify({ logger: true });
fastify.register(routes, { server: server });

fastify.listen({ port: 3001 }, (err) => { console.error(err); });
