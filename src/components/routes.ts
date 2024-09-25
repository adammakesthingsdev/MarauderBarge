/*
    API endpoints available from the frigate
*/

import { FastifyInstance, FastifyPluginOptions } from "fastify";
import S from "fluent-json-schema";
import { FrigateServer } from "../frigateserver";
import { Address, ShipRequest } from "./labelapi";


async function routes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    const server: FrigateServer = options.server;
    let someVal = 0;

    const addressSchema = {
        $id: 'address',
        type: 'object',
        required: ['name', 'addressLine1', 'cityLocality', 'stateProvince',
            'countryCode', 'postalCode'],
        properties: {
            name: { type: 'string' },
            companyName: { type: 'string' },
            phone: { type: 'string' },
            addressLine1: { type: 'string' },
            addressLine2: { type: 'string' },
            cityLocality: { type: 'string' },
            stateProvince: { type: 'string' },
            countryCode: { type: 'string' },
            postalCode: { type: 'string' }
        }
    };
    fastify.addSchema(addressSchema);

    const packageSchema = {
        $id: 'package',
        type: "object",
        required: ["length", "width", "height", "weight", "unitWeight", "unitLength"],
        properties: {
            length: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
            weight: { type: "number" },
            unitWeight: { type: "string" },
            unitLength: { type: "string" },
            description: { type: "string" },
        }
    };

    const shipSchema = {
        $id: "shipment",
        type: "object",
        required: ["toAddr", "fromAddr", "package", "location"],
        properties: {
            toAddr: { $ref: "address" },
            fromAddr: { $ref: "address" },
            package: { $ref: "package" },
            location: { type: "string" }
        }
    };

    const rateSchema = {
        $id: "rate",
        type: "object",
        required: ["toAddr", "fromAddr", "package"],
        properties: {
            toAddr: { $ref: "address" },
            fromAddr: { $ref: "address" },
            package: { $ref: "package" },
            location: { type: "string" }
        }
    };

    fastify.addSchema(packageSchema);
    fastify.addSchema(shipSchema);
    fastify.addSchema(rateSchema);



    console.log(":(");

    fastify.get("/ping", (request, reply) => {
        console.log(`pong ${someVal}`);
        someVal += 1;
        return (`pong ${someVal}`);
    });

    fastify.get("/listDinghies", (request, reply) => {
        return (JSON.stringify(server.dinghies.map((dinghy) => {
            return ({
                "name": dinghy.name,
                "location": dinghy.location,
                "connected": dinghy.connected
            });
        })));
    });

    fastify.post("/validateAddress", {
        async handler(request, reply) {
            return (server.validateAddress(request.body as Address));
        }, schema: { body: addressSchema }
    });

    fastify.post("/getRate", {
        async handler(request, reply) {
            const rate: any = await server.getRate(request.body as ShipRequest);
            return rate;
        }, schema: { body: rateSchema }
    });

    fastify.post("/ship", {
        async handler(request, reply) {
            const rate: any = await server.shipPackage(request.body as ShipRequest);
            return rate;
        }, schema: { body: shipSchema }
    });

};

export default routes;