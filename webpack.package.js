const TerserPlugin = require("terser-webpack-plugin");

const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const packageConfig = {
    mode: "production",
    output: {
        path: path.resolve(__dirname, "package", "dist"),
        filename: "[name].js",
        library: {
            name: "EvmWalletController",
            type: "umd"
        },
        clean: true
    },

    target: "web",

    resolve: {
        extensions: [ ".tsx", ".jsx", ".js", ".ts" ]
    },

    stats: "minimal",

    entry: {
        "EvmWalletController": path.resolve(__dirname, "package", "EvmWalletController"),
        "utils/get-installed-wallets": path.resolve(__dirname, "package", "utils", "get-installed-wallets"),
        "utils/waiting-ethereum-promise": path.resolve(__dirname, "package", "utils", "waiting-ethereum-promise"),
        "utils/network-utils": path.resolve(__dirname, "package", "utils", "network-utils")
    },

    plugins: [],

    module: {
        rules: [
            {
                test: /\.jsx?$/i,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.tsx?$/i,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.json"
                    }
                }
            },
            {
                test: /\.s[ac]ss$/i,
                use: [ MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "sass-loader" ]
            }
        ]
    },

    externals: {
        "mobx": {
            commonjs: "mobx",
            commonjs2: "mobx",
            amd: "mobx"
        },
        "@knownout/base-controller": {
            commonjs: "@knownout/base-controller",
            commonjs2: "@knownout/base-controller",
            amd: "@knownout/base-controller"
        },
        "@knownout/modal-window-controller": {
            commonjs: "@knownout/modal-window-controller",
            commonjs2: "@knownout/modal-window-controller",
            amd: "@knownout/modal-window-controller"
        },
        "@knownout/lib": {
            commonjs: "@knownout/lib",
            commonjs2: "@knownout/lib",
            amd: "@knownout/lib"
        },
        "bignumber.js": {
            commonjs: "bignumber.js",
            commonjs2: "bignumber.js",
            amd: "bignumber.js"
        },
        "@metamask/providers": {
            commonjs: "@metamask/providers",
            commonjs2: "@metamask/providers",
            amd: "@metamask/providers"
        },
        "web3": {
            commonjs: "web3",
            commonjs2: "web3",
            amd: "web3"
        },
        "@walletconnect/ethereum-provider": {
            commonjs: "@walletconnect/ethereum-provider",
            commonjs2: "@walletconnect/ethereum-provider",
            amd: "@walletconnect/ethereum-provider"
        }
    },

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
                    format: {
                        comments: false
                    }
                }
            })
        ]
    }
};

packageConfig.module.rules[1].use.options.configFile = "tsconfig.package.json";
module.exports = packageConfig;
