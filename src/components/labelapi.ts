/*
    The core of the frigate - this component gets rates, selects the best, and 
    purchases labels from ShipEngine.
*/

import ShipEngine from "shipengine";
import { GoogleAuth } from "google-auth-library";
import { AddressValidationClient } from "@googlemaps/addressvalidation";
import { Params } from "shipengine/esm/get-rates-with-shipment-details/types/public-params";
import { CreateLabelFromRateTypes } from "shipengine/esm/create-label-from-rate";
import { printFromURL } from "./print.js";
import 'dotenv/config';

const shipengine = new ShipEngine(process.env.SHIPENGINE_API!);

const auth = new GoogleAuth({
    keyFile: './creds.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const addressvalidationClient = new AddressValidationClient({ auth: auth });

interface Address {
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

interface Package {
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
    trackingRequired: boolean;
}

interface StrictAddress extends Address {
    phone: string;
    addressResidentialIndicator: "yes" | "no" | "unknown"
}

interface Rate {
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

    if (response === undefined) { throw Error("Address API failed!") }
    else {
        const correctedAddress = response[0].result!.address!.postalAddress!;
        let formatted: StrictAddress;

        if (response[0].result!.verdict!.addressComplete) {
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
            console.log(response[0].result?.address?.formattedAddress + "\n")
            return (corrected)

        } else { throw new Error("Address not found!") }
    }
}


export async function getRate(shipRequest: ShipRequest): Promise<Rate | undefined> {
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

        console.log("Best located rate:");
        //console.log(result);

        const rates = result.rateResponse.rates ?? [];
        const filteredRates = rates.filter(function (rate) {
            return rate.trackable && rate.packageType == "package";
        });
        //console.log(filteredRates)

        const bestRate = filteredRates[0];

        console.log(`Service: ${bestRate.serviceType}`)
        console.log(`Shipping amount: $${bestRate.shippingAmount.amount} USD`)
        console.log(`Delivery days: ${bestRate.carrierDeliveryDays}\n`)

        return {
            carrier: bestRate.carrierFriendlyName,
            service: bestRate.serviceType,
            rate: bestRate.rateId,
            price: bestRate.shippingAmount.amount,
        }

    } catch (e) {
        console.log("Error creating rates: ", e);
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
    }

    try {
        const result = await shipengine.createLabelFromRate(params);
        console.log("Label purchased! Downloading pdf...\n");
        printFromURL(result.labelDownload.pdf);
        console.log(`Tracking number: ${result.trackingNumber}`)

        //console.log(result);
    } catch (e: any) {
        console.log("Error creating label: ", e.message);
    }

}