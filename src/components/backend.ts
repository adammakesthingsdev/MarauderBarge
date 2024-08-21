/*
    Contains class structures, types and errors for both dinghy and frigate
*/

// Primary dinghy tree

import { Message } from "./messages";

export namespace Raft {

    // Represents values in "default.json" for one singular dinghy
    export interface DinghyConfig {
        name: string;
        location: string;
        type: string;
    }

    // Used for websocket backend on dinghy
    export interface DinghyConnection {
        ws: WebSocket | undefined;
        pingResponded: boolean;
        heartbeat: any;
        numFails: number;
    }

    // Generated from DinghyConfig, represents a useable dinghy object
    export class Dinghy {
        location: string;
        name: string;
        type: string;
        error: boolean;
        connected: boolean;
        ready: boolean;
        reason!: string;
        connection: DinghyConnection;


        constructor(conf: DinghyConfig) {
            this.location = conf.location;
            this.name = conf.name;
            this.type = conf.type;
            this.connected = false;
            this.error = false;
            this.ready = false;
            this.connection = {
                ws: undefined,
                pingResponded: false,
                heartbeat: undefined,
                numFails: 0
            };
        }

        printURL(url: string): any {
            if (this.ready && this.connected) {
                const printRequest: Message.FrigateMessage = {
                    type: "PrintReq",
                    params: {
                        url: url,
                    }
                };

                try {
                    this.connection.ws?.send(JSON.stringify(printRequest));
                } catch (error) {
                    console.log(error);
                }
            }

            throw new Errors.DinghyError({
                name: "NoAvailableDinghy",
                message: "This dinghy is not currently ready to print!",
                cause: ""
            });
        }

    }

    // A location (i.e. "office") to send prints to. May contain many dinghies
    export class Location extends Array<Dinghy> {
        name: string;
        constructor(name: string) {
            super();
            this.name = name;
        }

        // Selects best dinghy
        chooseDinghy(): Dinghy {
            for (const dinghy of this) {
                if (dinghy.connected) {
                    return (dinghy);
                }
            }
            throw new Errors.DinghyError({
                name: "NoAvailableDinghy",
                message: "Could not find an available dinghy at this location",
                cause: ""
            });
        }

        getDinghy(name: string): Dinghy {
            for (const dinghy of this) {
                if (dinghy.name == name) {
                    return (dinghy);
                }
            }
            throw new Errors.DinghyError({
                name: "DinghyNotFound",
                message: "Requested dinghy not found",
                cause: ""
            });
        }



    }

    // All available locations. This includes all dinghies within each.
    export class Locations {
        locations: { [key: string]: Location; };
        cfg: Array<DinghyConfig>;

        constructor(cfgs: Array<DinghyConfig>) {
            this.locations = {};
            this.cfg = cfgs;

            for (const dinghycfg of cfgs) {
                if (!(dinghycfg.location in this.locations)) {
                    this.locations[dinghycfg.location] = new Location(dinghycfg.location);
                }
                const dinghy = new Dinghy(dinghycfg);

                this.locations[dinghy.location].push(dinghy);
            }
        }
        // Find and return the best dinghy for the job
        selectDinghy(locationName: string) {
            if (locationName in this.locations) {
                this.locations[locationName].chooseDinghy();
            } else {
                throw new Errors.DinghyError({
                    name: "LocationNotFound",
                    message: "Requested location is not configured",
                    cause: ""
                });
            }
        }

        // Determine if dinghy exists
        dinghyExists(id: string): boolean {
            for (const cfg of this.cfg) {
                if (cfg.name == id) { return true; }
            }
            return false;
        }

        // Gets dinghy by ID and location
        getDinghy(name: string) {
            const location = this.cfg.find(i => i.name === name)?.location!;
            return (this.locations[location].getDinghy(name));
        }

    }

}

export namespace Errors {
    type DinghyErrorName = "DinghyNotFound" | "LocationNotFound" |
        "NoAvailableDinghy";

    export class DinghyError extends Error {
        name: DinghyErrorName;
        message: string;
        cause: string;

        constructor({ name, message, cause }: {
            name: DinghyErrorName;
            message: string;
            cause: string;
        }) {
            super();
            this.name = name;
            this.message = message;
            this.cause = cause;
        }
    }
}





