/*
    API endpoints available from the frigate
*/

import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { FrigateServer } from "frigateserver";


async function routes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    const server: FrigateServer = options.server;
    let someVal = 0;

    console.log(":(");

    fastify.get("/ping", () => {
        console.log(`pong ${someVal}`);
        someVal += 1;
        return (`pong ${someVal}`);
    });

    fastify.get("/listDinghies", () => {
        console.log(server.dinghyNames);
        return (JSON.stringify(server.dinghyNames));
    });
};

export default routes;