import { getNetworksValue, TNetworkInfo } from "./utils/network-utils";
import waitingEthereumPromise from "./utils/waiting-ethereum-promise";
import getInstalledWallets from "./utils/get-installed-wallets";
import BaseController from "@knownout/base-controller";
import { StorageController } from "@knownout/lib";
import modalWindowController from "@knownout/modal-window-controller";
import { MetaMaskInpageProvider } from "@metamask/providers";
import WalletConnectProvider from "@walletconnect/ethereum-provider";
import BigNumber from "bignumber.js";
import { action, computed, makeObservable, observable } from "mobx";
import Web3 from "web3";

/**
 * Cached provider local storage key.
 * @type {string}
 */
export const CachedEthereumProviderStorageKey = "cachedEthereumProvider";

/**
 * WalletConnect local storage data key.
 * @type {string}
 */
export const WalletConnectDataStorageKey = "walletconnect";

/**
 * Default networks list.
 * @type {{[p: number]: TNetworkInfo}}
 */
export const defaultNetworksList = {
    1: {
        currency: "ETH",
        rpc: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
    },

    56: {
        currency: "BNB",
        rpc: "https://bsc-dataseed.binance.org/"
    },

    250: {
        currency: "FTM",
        rpc: "https://rpc.ankr.com/fantom/"
    }
} as { [key: number]: TNetworkInfo };

interface IEvmWalletState {
    /** True only if the wallet is connected. */
    connected: boolean;

    /**
     * True only on controller initialization, not updated
     * when changing wallet.
     */
    loading: boolean;

    /** Current wallet balance, updated in real time. */
    balance?: BigNumber;

    /**
     * ID of the current network selected in the wallet,
     * updates in real time.
     */
    accountChain?: number;

    /** True if wallet balance updating right now. */
    balanceUpdating?: boolean;
}

interface IEvmWalletData {
    /** Key of the currently connected wallet (name) */
    connectedWalletKey: string;

    /** Web3 provider instance. */
    web3: Web3;

    /** Wallet provider Instance. */
    ethereum: MetaMaskInpageProvider;

    /** Connected account address. */
    accountAddress: string;
}

/**
 * EVM wallets controller
 */
class EvmWalletController extends BaseController<IEvmWalletState, Partial<IEvmWalletData>> {

    /** Storage controller */
    #storageController = new StorageController(localStorage);

    /** Wallet connection modal key */
    #modalKey?: string;

    #debugMode = false;

    /** Console output function */
    #debugFunction?: (...messages: any[]) => void;

    /** Console error output function */
    #errorFunction?: (...messages: any[]) => void;

    /**
     * List of available networks.
     *
     * Default: Fantom Opera, Binance Smart Chain and Ethereum Mainnet
     */
    @observable private networksList: { [key: number]: TNetworkInfo } = defaultNetworksList;

    /**
     * EVM wallets controller
     */
    constructor () {
        super({ connected: false, loading: true }, {});
        makeObservable(this);

        this.walletBalanceSubscription = this.walletBalanceSubscription.bind(this);
        this.walletChainSubscription = this.walletChainSubscription.bind(this);
        this.walletAccountsSubscription = this.walletAccountsSubscription.bind(this);
    }

    /**
     * Method for getting current network core currency symbol.
     * @return {string} core currency symbol.
     */
    @computed
    public get nativeTokenSymbol (): string {
        if (!this.state.accountChain) return "";

        return getNetworksValue("currency", this.networksList)[this.state.accountChain] ?? "";
    }

    /**
     * Method for changing the list of available networks.
     * @param {{[p: number]: TNetworkInfo}} networksList new available networks list.
     */
    @action
    public setNetworksList (networksList: { [key: number]: TNetworkInfo }) {
        this.networksList = networksList;
    }

    /**
     * Метод для инициализации контроллера.
     *
     * @param {string} modalKey wallet connection modal key.
     * @param {boolean} debugMode enable or disable debug mode (disabled by default).
     * @param {(...messages: any[]) => void} debugFunction console output function.
     * @param {(...messages: any[]) => void} errorFunction console error output function.
     *
     * @return {Promise<void>}
     */
    @action
    public async initController (
        modalKey: string,
        debugMode?: boolean,
        debugFunction?: (...messages: any[]) => void,
        errorFunction?: (...messages: any[]) => void
    ): Promise<void> {
        this.setState("loading", true);


        this.#modalKey = modalKey;

        if (debugMode) this.#debugMode = debugMode;

        if (debugFunction) this.#debugFunction = debugFunction;

        if (errorFunction) this.#errorFunction = errorFunction;


        const cachedProvider = this.#storageController.getItem<string>(CachedEthereumProviderStorageKey);

        if (!cachedProvider) {
            this.setState("loading", false);

            if (this.#debugMode) this.#debugFunction?.("Cached provider not found, wallet not connected");
            return;
        }

        if (cachedProvider && cachedProvider === "WalletConnect") {
            if (!this.#storageController.exist(WalletConnectDataStorageKey)) {
                this.#storageController.removeItem(CachedEthereumProviderStorageKey);

                if (this.#debugMode)
                    this.#errorFunction?.("WalletConnect data not found, clearing cached provider...");
                return;
            }

            const walletConnectEthereumProvider = new WalletConnectProvider({
                rpc: getNetworksValue("rpc", this.networksList)
            });

            await walletConnectEthereumProvider.connect();

            await this.connectWallet(walletConnectEthereumProvider as any, cachedProvider);

            this.setState("loading", false);
            return;
        }

        const walletEthereumProvider = await waitingEthereumPromise();

        if (!walletEthereumProvider) {
            this.setState("loading", false);

            if (this.#debugMode) this.#errorFunction?.("Ethereum provider not found, wallet not connected");
            return;
        }

        const wallets = await getInstalledWallets(walletEthereumProvider);

        if (!wallets.has(cachedProvider)) {
            this.setState("loading", false);

            if (this.#debugMode) this.#errorFunction?.("Wallet", cachedProvider, "not installed, clearing cache...");
            return;
        }

        await this.connectWallet(wallets.get(cachedProvider) as any, cachedProvider);

        this.setState("loading", false);
    }

    /**
     * Method for calling the relevant action to connect or disconnect the wallet.
     */
    @action
    public callWalletAction () {
        // If the wallet is connected, then disable it ...
        if (this.state.connected) this.disconnectWallet?.();

        if (this.state.loading) return;
        // ... or call a modal window to connect the wallet
        if (this.#modalKey && !this.state.connected) modalWindowController.openModal(this.#modalKey);
    }

    /**
     * Method for connecting the wallet to the application.
     *
     * @param {MetaMaskInpageProvider} ethereum wallet provider.
     * @param {string} walletKey key of the connected wallet (name).
     * @return {Promise<boolean>} connecting result.
     */
    @action
    public async connectWallet (
        ethereum: MetaMaskInpageProvider,
        walletKey: string
    ): Promise<boolean> {
        if (!ethereum) {
            if (this.#debugMode) this.#errorFunction?.("Ethereum provider not specified, wallet not connected");

            this.#storageController.removeItem(CachedEthereumProviderStorageKey);
            return false;
        }

        this.setData({ ethereum, web3: new Web3(ethereum as any) });

        try {
            await this.createWalletSubscription();

            const accounts = await this.requestConnectOrGetAccounts().catch(() => {
                throw new Error("Wallet initialization failed");
            });

            if (!accounts || accounts.length === 0) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("Accounts not found, wallet not connected");
            }

            this.#storageController.setItem(CachedEthereumProviderStorageKey, walletKey);

            const accountChain = await this.data.web3?.eth.getChainId();
            const accountBalance = await this.getAccountBalance(accounts[0], accountChain);

            if (this.#debugMode) this.#debugFunction?.("EVM wallet connected", accounts[0]);
            this.setState({ connected: true, balance: accountBalance, accountChain });

            this.setData({ accountAddress: accounts[0], connectedWalletKey: walletKey });

            return true;
        } catch (err) {
            if (this.#debugMode) this.#errorFunction?.(err);
            return false;
        }
    }

    /**
     * Method to disconnect the current wallet.
     * @protected
     */
    @action
    protected disconnectWallet () {
        if (this.data.connectedWalletKey === "WalletConnect") {
            this.#storageController.removeItem(WalletConnectDataStorageKey);
        }

        this.#storageController.removeItem(CachedEthereumProviderStorageKey);

        this.clearWalletSubscription();

        this.resetData();
        this.resetState("loading");

        if (this.#debugMode) this.#debugFunction?.("EVM wallet disconnected");
    }

    /**
     * Method for creating subscriptions to various wallet events.
     *
     * @return {Promise<void>}
     * @protected
     */
    @action
    protected async createWalletSubscription () {
        if (!this.data.ethereum) {
            if (this.#debugMode) this.#errorFunction?.(
                "Ethereum provider not found, subscriptions not created\n",
                "Try to call subscribe methods after setting provider"
            );

            return;
        }

        this.data.ethereum.off?.("accountsChanged", this.walletAccountsSubscription);

        this.data.ethereum.off?.("chainChanged", this.walletChainSubscription);

        this.data.ethereum.on("accountsChanged", this.walletAccountsSubscription as any);

        this.data.ethereum.on("chainChanged", this.walletChainSubscription as any);

        if (this.data.web3) {
            this.data.web3.eth.subscribe("newBlockHeaders", this.walletBalanceSubscription);
        }
    }

    /**
     * Method for canceling all created subscriptions.
     * @protected
     */
    @action
    protected clearWalletSubscription () {
        if (this.data.ethereum) {
            this.data.ethereum.off?.("accountsChanged", this.walletAccountsSubscription);

            this.data.ethereum.off?.("chainChanged", this.walletChainSubscription);
        }

        if (this.data.web3) this.data.web3.eth.clearSubscriptions(this.walletBalanceSubscription);

        if (this.#debugMode) this.#debugFunction?.("EVM wallet subscriptions cleared");
    }

    /**
     * Method for getting balance of the connected account in a selected chain.
     *
     * @param {string | undefined} account account address.
     * @param {number | undefined} chain chain identifier.
     * @return {Promise<BigNumber>} formatted account balance.
     * @protected
     */
    @action
    protected async getAccountBalance (account: string | undefined, chain: number | undefined) {
        if (!this.data.web3 || !chain || !account) return new BigNumber(0);

        let rawBalance = "0";

        try {
            rawBalance = await this.data.web3.eth.getBalance(account);
        } catch { }

        if (rawBalance === "0") {
            const rpcUrl = getNetworksValue("rpc", this.networksList)[chain];

            if (!rpcUrl) return new BigNumber(Web3.utils.fromWei(rawBalance));

            const httpWeb3Provider = new Web3(new Web3.providers.HttpProvider(rpcUrl));

            rawBalance = await httpWeb3Provider.eth.getBalance(account);
        }

        return new BigNumber(Web3.utils.fromWei(rawBalance));
    }

    /**
     * Method to bypass endless metamask connection bugs.
     * @return {Promise<string[]>} list of connected accounts.
     * @private
     */
    private async requestConnectOrGetAccounts (): Promise<string[]> {
        if (!this.data.web3 || !this.data.ethereum) return [];

        const wait = (time: number) => new Promise(r => setTimeout(r, time));

        // @ts-ignore
        const isInitRequest = this.data.ethereum.isMetaMask && this.data.ethereum._state?.initialized === false;

        let accounts: string[] | undefined = await Promise.race<any>([
            isInitRequest ? wait(1000) : undefined,
            this.data.web3.eth.getAccounts()
        ].filter(Boolean));

        if (accounts && accounts.length > 0) return accounts;

        if (isInitRequest) return [];

        accounts = await Promise.race<any>([
            this.data.ethereum.request({ method: "eth_requestAccounts" }),
            isInitRequest ? wait(1000) : undefined
        ].filter(Boolean));

        if (accounts && accounts.length > 0) return accounts;
        return [];
    }

    /**
     * Method for handling connected account change event.
     *
     * @param {string[]} accounts connected accounts list.
     * @return {Promise<void>}
     * @private
     */
    @action
    private async walletAccountsSubscription (accounts: string[]) {
        if (accounts[0] === this.data.accountAddress || !this.state.connected) return;

        const changeForChain = this.state.accountChain;

        const account = accounts[0];

        if (!account) {
            this.disconnectWallet();

            if (this.#debugMode) this.#errorFunction?.("Empty accounts response from web3");
            return;
        }

        if (this.#debugMode) this.#debugFunction?.("EVM wallet account changed to", account);

        const accountBalance = await this.getAccountBalance(account, this.state.accountChain);

        if (!this.state.connected || changeForChain !== this.state.accountChain) return;

        this.setState("balance", accountBalance);
        this.setData("accountAddress", account);
    }

    /**
     * Method for handling chain change event.
     *
     * @param {number | string} chain new chain identifier.
     * @return {Promise<void>}
     * @private
     */
    @action
    private async walletChainSubscription (chain: number | string) {
        if (!this.state.connected) return;

        const correctChain = String(chain).charAt(1).toLowerCase() === "x"
            ? Number.parseInt(String(chain), 16)
            : Number(chain);

        if (!correctChain) {
            if (this.#debugMode) this.#errorFunction?.("No chain provided, stay at selected");
            return;
        }

        if (!this.networksList[correctChain]) {
            this.setState({
                balance: new BigNumber(0),
                accountChain: -1
            });

            if (this.#debugMode) this.#errorFunction?.("Unsupported chain selected:", correctChain);
            return;
        }

        if (this.#debugMode) this.#debugFunction?.("EVM wallet chain changed to", correctChain);

        const accountBalance = await this.getAccountBalance(this.data.accountAddress, correctChain);

        if (!this.state.connected) return;
        this.setState({
            accountChain: correctChain,
            balance: accountBalance
        });
    }

    /**
     * Method for handling account balance change event.
     *
     * @param {Error | undefined} err block error.
     * @return {Promise<void>}
     * @private
     */
    @action
    private async walletBalanceSubscription (err: Error | undefined) {
        if (this.state.balanceUpdating) return;

        this.setState("balanceUpdating", true);

        if (err && this.#debugMode) this.#errorFunction?.(err);

        const changeForChain = this.state.accountChain;

        const accountBalance = await this.getAccountBalance(this.data.accountAddress, this.state.accountChain);

        if (!this.state.connected || changeForChain !== this.state.accountChain) return;

        this.setState({
            balance: accountBalance,
            balanceUpdating: false
        });
    }
}

const evmWallet = new EvmWalletController();
export default evmWallet;
