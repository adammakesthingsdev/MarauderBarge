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
import { buyLabel, correctAddress, getRate, } from "./components/labelapi.js";
import { Address, Rate, ShipRequest, StrictAddress } from "./components/labelapi.js";
import { getDinghyConfigs, getDinghyNames, LoggedPackage } from "./components/database.js";

/**
 *"Dinghy" object, from the perspective of a frigate. Contains connection / 
 * validation logic
 */
export class Dinghy {

    location: string;
    name: string;
    type: string;
    error: boolean;
    connected: boolean;
    connection!: Connection;
    ready: boolean;
    reason!: string;

    /**
     * Construct a Dinghy using a configuration object.
     * @param conf DinghyConfig configuration object
     */
    constructor(conf: DinghyConfig) {
        this.location = conf.location;
        this.name = conf.name;
        this.type = conf.type;
        this.connected = false;
        this.error = false;
        this.ready = false;
    }

    /**
     * Print a PDF from a URL remotely to the specified dinghy.
     * @param url URL to print
     * @returns Success/failure
     */
    async printURL(url: string) {
        return await new Promise((resolve, reject) => {
            const printRequest: Message.FrigateMessage = {
                type: "PrintReq",
                params: { url: url }
            };

            this.connection.sendMessage(printRequest);

            setTimeout(() => {
                reject(new Errors.ShipError({
                    name: "PrintFailed",
                    message: "Dinghy did not respond in time!"
                }));
            }, 1000);

            this.connection.onPrintResp((req) => {
                if (!req.success) {
                    reject(new Errors.ShipError({
                        name: "PrintFailed",
                        message: req.reason ?? ""
                    }));
                }
                resolve(":)");
                console.log(":D");
            });
        }).catch((e) => {
            console.log("caught one!!");
            console.error(e);
        });
    }
}

/**
 * Primary server class, contains logic for communicating with dinghies and
 * print APIs.
 */
export class FrigateServer {
    wss: WebSocketServer;
    dinghies: Dinghy[];
    dinghyNames: string[];
    locationNames: string[];
    connections: Connection[];

    /**
     * Constructs a DinghyServer, loads configuration, and starts the webserver
     */
    constructor() {
        this.dinghies = getDinghyConfigs();
        this.dinghyNames = getDinghyNames();
        this.locationNames = [];
        this.connections = [];



        this.wss = new WebSocketServer({ port: config.get("frigate.port") });
        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
            this.handleConnection(ws, req, this);
        });
    }

    /**
     * Returns the queryed dinghy object
     * @param searchName The dinghy's name to find
     * @returns Dinghy object on success
     */
    getDinghy(searchName: string): Dinghy {
        const dinghy = this.dinghies.find(({ name }) => name === searchName);
        if (dinghy != undefined) {
            return (dinghy);
        } throw new Errors.DinghyError({
            name: "DinghyNotFound",
            message: "Dinghy does not exist!"
        });
    }

    /**
     * Chooses the best dinghy at a given location to print a file.
     * @param searchLocation Location to print to
     * @returns Best Dinghy object on success
     */
    chooseDinghy(searchLocation: string): Dinghy {
        const dinghies = this.dinghies.filter(({ location }) => location === searchLocation);
        if (dinghies.length > 0) {
            //CHOOSING LOGIC HERE!!!!
            return (dinghies[0]);
        } throw new Errors.DinghyError({
            name: "DinghyNotFound",
            message: "No dinghy found at location!"
        });
    }

    /**
     * Callback for new server connections - sets them up with a Connection
     * object.
     * @param ws Passed-through WebSocket object
     * @param req Passed-through connection message
     * @param server Passed-through FrigateServer object
     */
    handleConnection(ws: WebSocket, req: IncomingMessage, server: FrigateServer) {
        const connection = new Connection(ws, req, this);
        this.connections.push(connection);
    }

    /**
     * Wrapper for validating an address
     * @param address Address object to validate
     * @returns Corrected address object on success
     */
    async validateAddress(address: Address): Promise<StrictAddress> {
        const strict: StrictAddress = await correctAddress(address);
        return strict;
    }

    /**
     * Wrapper for getting a rate
     * @param shipment Shipment object
     * @returns Rate object on success
     */
    async getRate(shipment: ShipRequest): Promise<Rate | undefined> {
        return (await getRate(shipment));
    }

    /**
     * Ships a package and (ideally) prints its shipping label.
     * @param shipment Shipment object
     * @returns Purchased shipping label object on success
     */
    async shipPackage(shipment: ShipRequest) {
        const log = new LoggedPackage(shipment);
        await log.init();

        const printer = this.chooseDinghy(shipment.location!);
        const rate = await getRate(shipment);
        const label = await buyLabel(rate);
        await printer.printURL(label.labelDownload.pdf);
        return (label);
    }
}

/**
 * Wrapper for creating, authenticating, and managing connection with each
 * dinghy.
 */
export class Connection {
    ws: WebSocket;
    frigateServer: FrigateServer;
    dinghy: Dinghy | undefined;
    heartbeat!: NodeJS.Timeout;
    pingTimeout!: NodeJS.Timeout;
    printTimeout!: NodeJS.Timeout;
    printRespCallback: (res: Message.DinghyPrintResp) => void;

    /**
     * Creates a Connection object and registers its connection callbacks.
     * @param ws WebSocket object for a dinghy
     * @param req Connection request message object
     * @param server FrigateServer to register the dinghy with
     */
    constructor(ws: WebSocket, req: IncomingMessage, server: FrigateServer) {
        this.ws = ws;
        this.frigateServer = server;
        this.dinghy = undefined;
        this.printRespCallback = () => { };
        console.log(`New client ${req.socket.remoteAddress} has connected`);

        this.ws.on("message", (msg: string) => {
            this.handleMessage(msg);
        });

    }

    /**
     * Callback for every message. Depending on the message type, this passes
     * them to other functions.
     * @param msg Recieved message object
     */
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
            case "PrintResponse":
                const response = message.params as Message.DinghyPrintResp;
                this.handlePrintResp(response);
                break;

            default:
                console.log(`Unexpected message type ${message.type}`);

        }
    }

    /**
     * Handler function for registration requests from (presumably) a dinghy
     * @param request Request message object, contains credentials
     */
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

    /**
     * Handler for regular status request "pings"
     * @param status Received message
     */
    handleStatusResp(status: Message.DinghyStatusResp) {
        if (this.dinghy!.connected) {
            this.dinghy!.ready = status.ready;
            clearInterval(this.pingTimeout);
        }
    }

    /**
     * Handler for print status response
     * @param req Received message
     */
    handlePrintResp(req: Message.DinghyPrintResp) {
        this.printRespCallback(req);
    }

    /**
     * Sets up callback for dinghy print responses.
     * @param callback Registered callback object
     */
    onPrintResp(callback: (req: Message.DinghyPrintResp) => void) {
        this.printRespCallback = callback;
    }

    /**
     * Sends a ping to the dinghy
     */
    checkPing() {
        this.sendPing();
        this.pingTimeout = setTimeout(() => { this.timeout(); }, 100);
    }

    /**
     * Handler for failure to respond to a ping. Marks dinghy as not ready
     * and disconnects.
     */
    timeout() {
        console.log(`${this.dinghy!.name} missed ping!`);
        this.dinghy!.ready = false;
        this.dinghy!.connected = false;
        clearInterval(this.heartbeat);
        this.sendError("PingError", "ya failed ping :(", true);
    }

    /**
     * Formats and sends a message through the websocket
     * @param message FrigateMessage object to send
     */
    sendMessage(message: Message.FrigateMessage) {
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Sends an error message to the dinghy.
     * @param type Type of error
     * @param reason Reason for error
     * @param kick If true, also kicks the dinghy
     */
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

    /**
     * Sends a "ping" request message.
     */
    sendPing() {
        const ping: Message.FrigateMessage = {
            type: "StatusReq", params: {}
        };
        this.sendMessage(ping);
    }
}