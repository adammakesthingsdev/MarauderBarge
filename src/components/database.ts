/**
 * Pocketbase configuration / class structure
 */

import PocketBase, { RecordModel, RecordService } from 'pocketbase';
import { DinghyConfig } from './_frigate_class_types';
import { Dinghy } from '../frigateserver.js';
import { Package, ShipRequest } from './labelapi';
import { Label } from 'shipengine/esm/create-label-from-shipment-details/types/private-request';

const pb = new PocketBase('http://127.0.0.1:8090');

const dinghyCollection = await pb.collection("dinghies").getFullList();
const packageLogCollection = pb.collection("packages")

export type PackageStatus = "Error" | "Awaiting printing" | "Awaiting shipment"
    | "Shipped" | "Delivered" | "Invalid" | "Purchasing label";

export interface AuthKey extends RecordModel {
    friendly: string;
    fullkey: string;
}

export interface PackageLog {
    packageReq: ShipRequest;
    isShipped: boolean;
    isPrinted: boolean;
    location?: string;
    dinghy?: DinghyConfig;
    requestDate: Date;
    shipDate?: Date;
    status: PackageStatus;
    requester?: AuthKey;
    label?: Label;
}

export function getDinghyConfigs(): Dinghy[] {
    const dinghies = dinghyCollection.map((dinghy) => {
        const cfg = dinghy as unknown as DinghyConfig;
        return (new Dinghy(cfg));
    });
    return (dinghies);
}

export function getDinghyNames(): string[] {
    return (dinghyCollection.map((dinghy) => { return dinghy.name; }));
}

export function getDinghyLocations(): string[] {
    return (dinghyCollection.map((dinghy) => { return dinghy.location; }));
}

export class LoggedPackage {
    packageReq: ShipRequest;

    constructor(packageReq: ShipRequest) {
        this.packageReq = packageReq;
    }

    async init(){
        const data:PackageLog = {
            packageReq:this.packageReq,
            isShipped:false,
            isPrinted:false,
            location:this.packageReq.location,
            requestDate: new Date(Date.now()),
            status:'Purchasing label',
            
        }

        await packageLogCollection.create(data);
    }

    async shipped(){
        const data = {
            isShipped:true,
            shipDate: Date.now().toString(),
        }
    }
}
