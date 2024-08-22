/*
    The core of the frigate - this component gets rates, selects the best, and 
    purchases labels from ShipEngine.
*/

import ShipEngine from "shipengine";
import { GoogleAuth } from "google-auth-library";
import { AddressValidationClient } from "@googlemaps/addressvalidation";
import { Params } from "shipengine/esm/get-rates-with-shipment-details/types/public-params";
import { CreateLabelFromRateTypes } from "shipengine/esm/create-label-from-rate";
import { Errors } from "./errors.js";
import 'dotenv/config';
//import { API } from "./routes.js";

const shipengine = new ShipEngine(process.env.SHIPENGINE_API!);

const auth = new GoogleAuth({
    keyFile: './creds.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const addressvalidationClient = new AddressValidationClient({ auth: auth });

export interface Address {
    name: string;
    companyName?: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string;
    cityLocality: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
}

export interface Package {
    length: number;
    width: number;
    height: number;
    weight: number;
    unitWeight: string;
    unitLength: string;
    description: string;
}

export interface ShipRequest {
    toAddr: Address;
    fromAddr: Address;
    package: Package;
    marina?: string;
}

export interface StrictAddress extends Address {
    phone: string;
    addressResidentialIndicator: "yes" | "no" | "unknown";
}

export interface Rate {
    carrier: string;
    price: number;
    rate: string;
    service: string;
}

export async function correctAddress(rawAddress: Address): Promise<StrictAddress> {

    const request = {
        address: {
            addressLines: [
                rawAddress.addressLine1,
                rawAddress.addressLine2 ?? "",
                rawAddress.cityLocality,
                rawAddress.countryCode,
                rawAddress.stateProvince,
                rawAddress.postalCode,
            ]
        },
    };

    const response = await addressvalidationClient.validateAddress(request);
    if (response == undefined) {
        throw new Errors.ShipError({
            name: "AddressError", message: "Address API failed!"
        });
    }

    const correctedAddress = response[0].result!.address!.postalAddress!;
    let formatted: StrictAddress;

    if (!response[0].result!.verdict!.addressComplete) {
        throw new Errors.ShipError({
            name: "BadAddress", message: "Address not complete!"
        });
    }

    console.log("Address found!");
    const corrected: StrictAddress = {
        name: rawAddress.name,
        addressLine1: correctedAddress.addressLines![0],
        addressLine2: correctedAddress.addressLines![1],
        cityLocality: correctedAddress.locality!,
        stateProvince: correctedAddress.administrativeArea!,
        postalCode: correctedAddress.postalCode!,
        countryCode: correctedAddress.regionCode!,
        phone: "1-855-625-HACK",
        addressResidentialIndicator: "yes",
    };
    console.log(response[0].result?.address?.formattedAddress + "\n");
    return (corrected);


}

export async function getRate(shipRequest: ShipRequest): Promise<Rate> {
    const shipTo = await correctAddress(shipRequest.toAddr);
    const shipFrom = await correctAddress(shipRequest.fromAddr);

    const options: Params = {
        rateOptions: { carrierIds: ["se-571390"] }, //change to actual carrier!
        shipment: {
            validateAddress: "validate_and_clean",
            shipTo: shipTo,
            shipFrom: shipFrom,
            packages: [{
                weight: {
                    value: shipRequest.package.weight,
                    unit: shipRequest.package.unitWeight,
                },
                dimensions: {
                    unit: shipRequest.package.unitLength,
                    height: shipRequest.package.height,
                    width: shipRequest.package.width,
                    length: shipRequest.package.length,
                }
            },],
        },
    };
    try {
        const result = await shipengine.getRatesWithShipmentDetails(options);

        const rates = result.rateResponse.rates;
        if (rates == null || rates == undefined) {
            throw new Errors.ShipError({
                name: "NoAvailableRate",
                message: "Could not find a shipping rate!"
            });
        }

        const filteredRates = rates.filter(function (rate) {
            return rate.trackable && rate.packageType == "package";
        });

        const bestRate = filteredRates[0];

        return {
            carrier: bestRate.carrierFriendlyName,
            service: bestRate.serviceType,
            rate: bestRate.rateId,
            price: bestRate.shippingAmount.amount,
        };
    }
    catch (e: any) {
        console.log(e);
        throw new Errors.ShipError({
            name: "ShipmentFailed", message: "Unknown error fetching rate!"
        });
    }
}

export async function buyLabel(rate: Rate) {
    const params: CreateLabelFromRateTypes.Params = {
        rateId: rate.rate,
        validateAddress: "no_validation",
        labelLayout: "4x6",
        labelFormat: "pdf",
        labelDownloadType: "url",
        displayScheme: "label"
    };

    try {
        const result = await shipengine.createLabelFromRate(params);
        console.log(`Tracking number: ${result.trackingNumber}`);
        return (result);
    }
    catch (e) {
        console.log(e);
        throw new Errors.ShipError({
            name: "ShipmentFailed", message: "Failed to purchase label!"
        });
    }    //printFromURL(result.labelDownload.pdf);
}