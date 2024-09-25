/*
    Authentication library, used by both dinghy and frigate. For now, just used
    for validating dinghy connections.
*/

import config from 'config';
import { SimpleCrypto } from "simple-crypto-js";

export function getTimestamp() {
    const fivemin = 1000 * 60 * 5;
    const timestamp = Math.round(Date.now() / fivemin) * fivemin;
    return (timestamp);
}

export function encodeSecret() {
    const crypto = new SimpleCrypto(config.get("dinghy.authkey"));

    return crypto.encrypt(getTimestamp());
}

export function checkSecret(encrypted: string) {
    const crypto = new SimpleCrypto(config.get("frigate.authkey"));
    try {
        const decrypted = crypto.decrypt(encrypted);
        return (decrypted == getTimestamp());
    } catch (error) {
        console.log("Invalid encrypted text!")
        return false
    }
}
