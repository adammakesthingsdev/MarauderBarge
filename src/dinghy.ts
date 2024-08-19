/*
    Primary client logic for each dinghy. Communicates with its frigate and 
    prints upon request.
*/

import WebSocket from "ws";
import { encodeSecret } from "./components/auth.js";
import { DinghyMessage, FrigateMessage, FrigateRegisterResp } from "components/messages.js";

const ws = new WebSocket('ws://localhost:8080');

const me: DinghyMessage = {
    type: "RegisterReq",
    params: {
        secret: encodeSecret(),
        name: "Adam Jr."
    }
};

ws.on('open', () => {
    console.log('Connected to server');

    ws.send(JSON.stringify(me));
});

ws.on('message', (resp: string) => {
    const message = JSON.parse(resp) as FrigateMessage; 
    
    switch(message.type){
        case "RegisterResp":
            console.log(`Authenticated: ${(message.params as FrigateRegisterResp).success}`)
    }

});

ws.on('close', () => {
    //console.log('Disconnected from server');
});