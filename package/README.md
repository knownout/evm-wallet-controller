# 💷 EVM wallet controller

EVM wallet controller that allows to connect different EVM wallets to decentralized
application and get basic data and providers.

Before using controller, you need to initialize it:

```tsx
import evmWallet from "@knownout/evm-wallet-controller"

function App () {
    useEffect(() => {
        // Since the initialization should only be done
        // once, we do it inside the effect.
        // In this case controller will use predefined list of networks
        evmWallet.initController("web3-connect");

        // If you want use your own list of available networks, 
        // call setNetworksList method after init:
        evmWallet.setNetworksList(myNetworksList);
    }, []);

    return (
        <div>
            { /* ... */ }
        </div>
    );
}
```

To connect or disconnect the wallet, you can call the `callWalletAction` method:

```tsx
function App () {
    return (
        <button
            onClick={ () => evmWallet.callWalletAction() }
            disabled={ evmWallet.state.loading }
        >
            {
                evmWallet.state.loading
                    ? "Loading"
                    : evmWallet.state.connected
                        ? "Disconnect wallet"
                        : "Connect wallet"
            }
        </button>
    )
}
```

To get a core currency symbol and balance, use following methods:

```ts
evmWallet.state.balance.toFixed() // Formatted core currency balance as string

evmWallet.nativeTokenSymbol // Getter
```

knownout - https://github.com/knownout/
<br>knownout@hotmail.com
