/*
    Type definitions for dinghy/frigate backend
*/

export namespace Message {

    //Generic message from dinghy
    export interface DinghyMessage {
        type: "RegisterReq" | "StatusResp";
        params: any;
    }

    //Generic message from frigate
    export interface FrigateMessage {
        type: "RegisterResp" | "StatusReq" | "PrintReq";
        params: any;
    }

    export type FrigateError = "AuthError" | "PingError"

    export interface FrigateErrorMessage {
        type: FrigateError;
        params: {
            reason:string;
        }
    }

    // Registration request from dinghy
    export interface DinghyRegistrationReq {
        name: string;
        secret: string;
    }

    // Response to dinghy's registration request
    export interface FrigateRegisterResp {
        success: boolean;
        reason: string | "";
    }

    // Response from dinghy about status
    export interface DinghyStatusResp {
        ready: boolean;
        reason: string | "";
        name: string;
    }

    // Print request!!!
    export interface FrigratePrintReq {
        url: string | "";
    }
}