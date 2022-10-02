import { MetaMaskInpageProvider } from "@metamask/providers";

/**
 * Function for getting a list of ethereum wallets available for connection.
 *
 * @param {any} provider global ethereum provider.
 * @return {Map<string, MetaMaskInpageProvider>} list of available wallet providers.
 */
export default function getInstalledWallets<T = any> (
    provider?: T
): Map<string, MetaMaskInpageProvider> {
    const wallets: Map<string, MetaMaskInpageProvider> = new Map();

    if (!provider) return wallets;

    if ((provider as any).providerMap) return (provider as any).providerMap;
    else {
        if ((provider as any).isMetaMask)
            return new Map([ [ "MetaMask", provider as any as MetaMaskInpageProvider ] ]);

        if ((provider as any).isCoinbaseWallet || (provider as any).isCoinbaseBrowser)
            return new Map([ [ "CoinbaseWallet", provider as any as MetaMaskInpageProvider ] ]);
    }

    return wallets;
}
