/*
    Primary client logic for each dinghy. Communicates with its frigate and 
    prints upon request.
*/

import WebSocket from "ws";
import { encodeSecret } from "./components/auth.js";
import { Message } from "components/messages.js";
import config from 'config';
import { printFromURL } from "./components/print.js";
import { Errors } from "components/errors.js";


const me: Message.DinghyMessage = {
    type: "RegisterReq",
    params: {
        secret: encodeSecret(),
        name: "Adam Jr."
    }
};

function sendStatus(ws: WebSocket) {
    //console.log("Pinged! Responding...")
    const status: Message.DinghyMessage = {
        type: "StatusResp",
        params: {
            name: "Adam Jr.",
            ready: true
        }
    };
    ws.send(JSON.stringify(status));
}

function handlePrintReq(url: string, ws: WebSocket) {
    console.log("Recieved print request! Printing...");

    try {
        printFromURL(url);
        console.log("Printed!");

        const resp: Message.DinghyMessage = {
            type: "PrintResponse",
            params: { success: true }
        };

        ws.send(JSON.stringify(resp));
    }
    catch (err) {

        console.log("Print error!");
        const error: Message.DinghyMessage = {
            type: "PrintResponse",
            params: {
                success: false,
                name: "PrintFailure",
                message: "Unknown print failure!"
            }
        };

        ws.send(JSON.stringify(error));
    }

}

function connect() {
    const ws = new WebSocket(config.get("dinghy.host"));
    console.log(`Connecting to ${ws.url}...`);

    ws.on('open', () => {
        console.log('Connected to server');
        ws.send(JSON.stringify(me));
    });

    ws.on('message', (resp: string) => {
        const message = JSON.parse(resp) as Message.FrigateMessage;

        switch (message.type) {
            case "RegisterResp":
                console.log(`Authenticated: ${(message.params as Message.FrigateRegisterResp).success}`);
                break;
            case "StatusReq":
                sendStatus(ws);
                break;
            case "PrintReq":
                console.log(message);
                handlePrintReq(message.params.url, ws);
                break;
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from server');
    });
}

connect();