/*
    Test file. It's for testing. Who'd've thought?
*/

import { buyLabel, getRate } from './labelapi.js';
import { ShipRequest } from './labelapi.js';

const request:ShipRequest = {
    toAddr:{
        name: 'Joey B.',
        addressLine1: '1600 Pennsylvania Avenue',
        cityLocality: 'Washington',
        stateProvince: 'DC',
        postalCode: '20500',
        countryCode: 'United States'
    },
    fromAddr:{
        name: 'Adam Greenberg',
        addressLine1: '15 Falls rd',
        cityLocality: 'Shelburne',
        stateProvince: 'Vermont',
        postalCode: '05482',
        countryCode: 'US'
    },
    package:{
        length: 5,
        width: 3,
        height: 2,
        weight: 5.1,
        unitWeight: 'ounce',
        unitLength: 'inch',
        description: 'Hack Club swag!'
    },
    trackingRequired:true
}

async function testBuy(){
    const rate = await getRate(request);
    buyLabel(rate!);
}

testBuy();