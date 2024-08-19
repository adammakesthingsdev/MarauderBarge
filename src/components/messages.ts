/*
    Type definitions for dinghy/frigate backend
*/

export interface DinghyMessage {
    type: "RegisterReq";
    params: any;
}

export interface DinghyRegistrationReq {
    name: string;
    secret: string;
}

export interface FrigateMessage {
    type: "RegisterResp";
    params: any;
}

export interface FrigateRegisterResp{
    success: boolean;
    reason: string | "";
}

export interface DinghyConfig {
    name: string;
    location: string;
    type: string;
}