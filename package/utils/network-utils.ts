export type TNetworkInfo = {
    /** Chain core currency symbol. */
    currency: string;

    /** Chain rpc URL. */
    rpc: string;
}

/**
 * Function to get a specific field from the list of available networks.
 * @param {keyof TNetworkInfo} key required field name.
 * @param {{[p: number]: TNetworkInfo}} networksList available networks list.
 * @return {any}
 */
export function getNetworksValue<T = TNetworkInfo> (key: keyof T, networksList: { [key: number]: T }) {
    return Object.fromEntries(Object.entries(networksList).map(([ objectKey, value ]) =>
        [ objectKey, value[key] ]
    ));
}
