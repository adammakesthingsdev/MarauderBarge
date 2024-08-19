/*
    Primary server logic. Communicates with each dinghy, sends print requests,
    manages queue, and handles communication with client.
*/

import { WebSocketServer, WebSocket } from "ws";
import { createServer } from 'http';
import config from 'config';
import { DinghyMessage, DinghyRegistrationReq, FrigateMessage, DinghyConfig } from "components/messages";
import { checkSecret } from "./components/auth.js";

class Dinghy {
    location: string;
    name: string;
    type: string;
    error: boolean;
    isConnected: boolean;
    connection: WebSocket | undefined;

    constructor(conf: DinghyConfig) {
        this.location = conf.location;
        this.name = conf.name;
        this.type = conf.type;
        this.isConnected = false;
        this.error = false;
    }
}

class Location extends Array<Dinghy> {
    name: string;
    constructor(name:string){
        super();
        this.name = name;
    }
}

class Locations extends Array<Location> {
    constructor(cfgs: Array<DinghyConfig>) {
        super();
        for(const dinghy of cfgs){
                if(!this.some(l => l.name===dinghy.location)){
                    this.push(new Location(dinghy.location));
                }
                
        }
    }
}


const dinghyConfigs = config.get("frigate.dinghies") as Array<DinghyConfig>;
const dinghies = dinghyConfigs.map((dinghy) => (new Dinghy(dinghy)));

let locations = {};


const server = createServer();
const wss = new WebSocketServer({ port: config.get("frigate.port") });

function registrationReq(message: DinghyRegistrationReq, ws: WebSocket) {
    const dinghies = config.get("frigate.dinghies") as Array<DinghyConfig>;
    const names = dinghies.map(({ name }) => name);

    console.log(`Client requested registration as ${message.name}`);

    if (!checkSecret(message.secret)) {
        const response: FrigateMessage = {
            type: "RegisterResp",
            params: {
                success: false,
                reason: "Auth failed"
            }
        };

        console.log(`${message.name} failed authentication`);
        ws.send(JSON.stringify(response));
        ws.close();
    }
    else if (!(names.includes(message.name))) {
        const response: FrigateMessage = {
            type: "RegisterResp",
            params: {
                success: false,
                reason: "Unknown name"
            }
        };

        console.log(`${message.name} failed authentication`);
        ws.send(JSON.stringify(response));
        ws.close();
    }
    else {
        const response: FrigateMessage = {
            type: "RegisterResp",
            params: { success: true }
        };

        console.log(`${message.name} authenticated`);
        ws.send(JSON.stringify(response));
    }
}

wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');

    ws.on('message', (req: string) => {
        const message = JSON.parse(req) as DinghyMessage;

        switch (message.type) {
            case "RegisterReq":
                registrationReq(message.params as DinghyRegistrationReq, ws);
                break;
            default:
                console.error("smth went wrong :(");
        }
    });
});
