export namespace Errors {
    type DinghyErrorName = "DinghyNotFound" | "LocationNotFound" |
        "NoAvailableDinghy";

    export class DinghyError extends Error {
        name: DinghyErrorName;
        message: string;

        constructor({ name, message }: {
            name: DinghyErrorName;
            message: string;
        }) {
            super();
            this.name = name;
            this.message = message;
        }
    }

    type ShipErrorName = "BadAddress" | "NoAvailableRate" |
    "ShipmentFailed" | "AddressError" | "PrintFailed";
    export class ShipError extends Error {
        name: ShipErrorName;
        message: string;

        constructor({ name, message }: {
            name: ShipErrorName;
            message: string;
        }) {
            super();
            this.name = name;
            this.message = message;
        }
    }
}

