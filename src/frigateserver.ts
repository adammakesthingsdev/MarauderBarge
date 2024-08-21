/*
    Experimental alternate frigate structure
*/

import WebSocket, { WebSocketServer } from "ws";
import config from 'config';
import { Errors } from "./components/errors.js";
import { DinghyConfig } from "./components/_frigate_class_types.js";
import { IncomingMessage } from "http";
import { Message } from "./components/messages.js";
import { checkSecret } from "./components/auth.js";
import Fastify from "fastify";

export class Dinghy {

    location: string;
    name: string;
    type: string;
    error: boolean;
    connected: boolean;
    connection!: Connection;
    ready: boolean;
    reason!: string;


    constructor(conf: DinghyConfig) {
        this.location = conf.location;
        this.name = conf.name;
        this.type = conf.type;
        this.connected = false;
        this.error = false;
        this.ready = false;
    }
}

export class FrigateServer {
    wss: WebSocketServer;
    dinghies: Dinghy[];
    dinghyNames: string[];
    locationNames: string[];
    connections: Connection[];

    constructor() {
        this.dinghies = [];
        this.dinghyNames = [];
        this.locationNames = [];
        this.connections = [];

        for (const dinghy of config.get("frigate.dinghies") as Array<DinghyConfig>) {
            this.dinghies.push(new Dinghy(dinghy));
            this.dinghyNames.push(dinghy.name);
            if (!this.locationNames.includes(dinghy.location)) {
                this.locationNames.push(dinghy.location);
            }
        }

        this.wss = new WebSocketServer({ port: config.get("frigate.port") });
        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
            this.handleConnection(ws, req, this);
        });
    }

    getDinghy(searchName: string): Dinghy {
        const dinghy = this.dinghies.find(({ name }) => name === searchName);
        if (dinghy != undefined) {
            return (dinghy);
        } throw new Errors.DinghyError({
            name: "DinghyNotFound",
            message: "Dinghy does not exist!"
        });
    }

    chooseDinghy(searchLocation: string): Dinghy {
        const dinghies = this.dinghies.filter(({ location }) => location === searchLocation);
        if (dinghies.length > 0) {
            //CHOOSING LOGIC HERE!!!!
            return (dinghies[0]);
        } throw new Errors.DinghyError({
            name: "DinghyNotFound",
            message: "Dinghy does not exist!"
        });
    }

    handleConnection(ws: WebSocket, req: IncomingMessage, server: FrigateServer) {
        const connection = new Connection(ws, req, this);
        this.connections.push(connection);
    }
}

export class Connection {
    ws: WebSocket;
    frigateServer: FrigateServer;
    dinghy: Dinghy | undefined;
    heartbeat!: NodeJS.Timeout;
    pingTimeout!: NodeJS.Timeout;


    constructor(ws: WebSocket, req: IncomingMessage, server: FrigateServer) {
        this.ws = ws;
        this.frigateServer = server;
        this.dinghy = undefined;
        console.log(`New client ${req.socket.remoteAddress} has connected`);

        this.ws.on("message", (msg: string) => {
            this.handleMessage(msg);
        });

    }

    handleMessage(msg: string) {
        const message = JSON.parse(msg) as Message.DinghyMessage;

        switch (message.type) {
            case "RegisterReq":
                const request = message.params as Message.DinghyRegistrationReq;
                this.handleRegisterReq(request);
                break;
            case "StatusResp":
                const status = message.params as Message.DinghyStatusResp;
                this.handleStatusResp(status);
                break;
            default:
                console.log(`Unexpected message type ${message.type}`);

        }
    }

    handleRegisterReq(request: Message.DinghyRegistrationReq) {
        if (!checkSecret(request.secret)) {
            this.sendError("AuthError", "Incorrect credentials", true);
        } else if (!this.frigateServer.dinghyNames.includes(request.name)) {
            this.sendError("AuthError", "Unknown name", true);
        } else {
            console.log(`Client ${request.name} authenticated :)`);
            this.dinghy = this.frigateServer.getDinghy(request.name);
            this.dinghy.connected = true;
            this.dinghy.connection = this;

            this.heartbeat = setInterval(() => { this.checkPing(); }, 3000);
        }
    }

    handleStatusResp(status: Message.DinghyStatusResp) {
        if (this.dinghy!.connected) {
            this.dinghy!.ready = status.ready;
            clearInterval(this.pingTimeout);
        }
    }

    checkPing() {
        this.sendPing();
        this.pingTimeout = setTimeout(() => { this.timeout(); }, 100);
    }

    timeout() {
        console.log(`${this.dinghy!.name} missed ping!`);
        this.dinghy!.ready = false;
        this.dinghy!.connected = false;
        clearInterval(this.heartbeat);
        this.sendError("PingError", "ya failed ping :(", true);
    }

    sendMessage(message: Message.FrigateMessage) {
        this.ws.send(JSON.stringify(message));
    }

    sendError(type: Message.FrigateError, reason: string, kick = false) {
        const error: Message.FrigateErrorMessage = {
            type: type,
            params: {
                reason: reason
            }
        };

        this.ws.send(JSON.stringify(error));
        if (kick) { this.ws.close(); }
    }

    sendPing() {
        const ping: Message.FrigateMessage = {
            type: "StatusReq", params: {}
        };
        this.sendMessage(ping);
    }
}