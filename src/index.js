import providers from 'lib/providers';
import utils from 'utils';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { sha3_256 } from 'js-sha3';

import TransactionBuilder from 'lib/transactionBuilder';
import Trx from 'lib/trx';
import Witness from 'lib/witness';

export default class TronWeb {
    static providers = providers;
    static BigNumber = BigNumber;
    
    constructor(fullNode, solidityNode, eventServer = false, privateKey = false) {
        if(utils.isString(fullNode))
            fullNode = new providers.HttpProvider(fullNode);

        if(utils.isString(solidityNode))
            solidityNode = new providers.HttpProvider(solidityNode);

        this.setFullNode(fullNode);
        this.setSolidityNode(solidityNode);
        this.setEventServer(eventServer);
        
        this.providers = providers;
        this.BigNumber = BigNumber;

        this.defaultBlock = false;
        this.defaultPrivateKey = false;
        this.defaultAddress = false;
        
        [
            'sha3', 'toHex', 'toUtf8', 'fromUtf8',
            'toAscii', 'fromAscii', 'toDecimal', 'fromDecimal',
            'toSun', 'fromSun', 'toBigNumber', 'isAddress',
            'compile', 'createAccount', 'address'
        ].forEach(key => {
            this[key] = TronWeb[key];
        });

        if(privateKey)
            this.setPrivateKey(privateKey);

        this.transactionBuilder = new TransactionBuilder(this);
        this.trx = new Trx(this);
        this.witness = new Witness(this);

        this.injectPromise = utils.promiseInjector(this);
    }

    setDefaultBlock(blockID = false) {
        if(blockID === false || blockID == 'latest' || blockID == 'earliest')
            return this.defaultBlock = blockID;

        if(!utils.isInteger(blockID) || !blockID)
            throw new Error('Invalid block ID provided');

        this.defaultBlock = +blockID;
    }

    setPrivateKey(privateKey) {
        // Set address first as it clears the private key
        this.setAddress(
            this.address.fromPrivateKey(privateKey)
        );

        // TODO: Validate private key
        this.defaultPrivateKey = privateKey;        
    }

    setAddress(address) {
        if(!this.isAddress(address))
            throw new Error('Invalid address provided');

        this.defaultPrivateKey = false;
        this.defaultAddress = {
            hex: this.address.toHex(address),
            base58: this.address.fromHex(address)
        };
    }

    isValidProvider(provider) {
        return Object.values(providers).some(knownProvider => provider instanceof knownProvider);
    }

    isEventServerConnected() {
        if(!this.eventServer)
            return false;

        return axios.get(this.eventServer).then(({ data }) => {
            return utils.hasProperty(data, '_links');
        }).catch(() => false);
    }

    setFullNode(fullNode) {
        if(!this.isValidProvider(fullNode))
            throw new Error('Invalid full node provided');

        this.fullNode = fullNode;
        this.fullNode.setStatusPage('wallet/getnowblock');
    }

    setSolidityNode(solidityNode) {
        if(!this.isValidProvider(solidityNode))
            throw new Error('Invalid solidity node provided');

        this.solidityNode = solidityNode;
        this.solidityNode.setStatusPage('walletsolidity/getnowblock');
    }

    setEventServer(eventServer = false) {
        if(eventServer !== false && !utils.isValidURL(eventServer))
            throw new Error('Invalid URL provided for event server');

        this.eventServer = eventServer;
    }

    currentProviders() {
        return {
            fullNode: this.fullNode,
            solidityNode: this.solidityNode,
            eventServer: this.eventServer
        };
    }

    currentProvider() {
        return this.currentProviders();
    }

    // TODO
    getEventResult(contractAddress, eventName, blockNumber, callback = false) {
        if(!callback)
            return this.injectPromise(this.getEventResult, contractAddress, eventName, blockNumber);
    }

    // TODO
    getEventByTransacionID(transactionID, callback = false) {
        if(!callback)
            return this.injectPromise(this.getEventByTransacionID, transactionID);
    }

    static get address() {
        return {
            fromHex(address) {
                if(!utils.isHex(address))
                    return address;

                return utils.crypto.getBase58CheckAddress(
                    utils.code.hexStr2byteArray(address)
                );
            },
            toHex(address) {
                if(utils.isHex(address))
                    return address;

                return utils.code.byteArray2hexStr(
                    utils.crypto.decodeBase58Address(address)
                );
            },
            fromPrivateKey(privateKey) {
                try {
                    return utils.crypto.pkToAddress(privateKey);
                } catch { return false; }
            }
        }
    }

    static sha3(string) {
        return sha3_256(string);
    }

    static toHex(val) {
        if(utils.isBoolean(val))
            return TronWeb.fromDecimal(+val);

        if(utils.isBigNumber(val))
            return TronWeb.fromDecimal(val);

        if(typeof val === 'object')
            return TronWeb.fromUtf8(JSON.stringify(val));

        if(utils.isString(val)) {
            if(val.indexOf('-0x') === 0)
                return TronWeb.fromDecimal(val);

            if(val.indexOf('0x') === 0)
                return val;

            if(!isFinite(val))
                return TronWeb.fromUtf8(val);
        }

        return TronWeb.fromDecimal(val);
    }

    static toUtf8(hex) {
        return Buffer.from(hex, 'hex').toString('utf8');
    }

    static fromUtf8(string) {
        return Buffer.from(string, 'utf8').toString('hex');
    }

    static toAscii(hex) {
        return Buffer.from(hex, 'hex').toString('ascii');
    }

    static fromAscii(string, padding) {
        return Buffer.from(string, 'ascii').toString('hex').padEnd(padding, '0');
    }

    static toDecimal(value) {
        return TronWeb.toBigNumber(value).toNumber();
    }

    static fromDecimal(value) {
        const number = TronWeb.toBigNumber(value);
        const result = number.toString(16);

        return number.lessThan(0) ? '-0x' + result.substr(1) : '0x' + result;
    }

    static fromSun(sun) {
        const trx = TronWeb.toBigNumber(trx).div(1_000_000);        
        return utils.isBigNumber(sun) ? trx : trx.toString(10);
    }

    static toSun(trx) {
        const sun = TronWeb.toBigNumber(trx).times(1_000_000);        
        return utils.isBigNumber(trx) ? sun : sun.toString(10);
    }

    static toBigNumber(amount = 0) {
        if(utils.isBigNumber(amount))
            return amount;

        if(utils.isString(amount) && (amount.indexOf('0x') === 0 || amount.indexOf('-0x') === 0))
            return new BigNumber(amount.replace('0x', ''), 16);

        return new BigNumber(amount.toString(10), 10);
    }

    static isAddress(address = false) {
        if(!utils.isString(address))
            return false;

        // Convert HEX to Base58
        if(address.length === 42) {
            return TronWeb.isAddress(
                utils.crypto.getBase58CheckAddress(
                    utils.code.hexStr2byteArray(address)
                )
            );
        }

        return utils.crypto.isAddressValid(address);
    }

    // TODO
    static compile(solditySource) {

    }

    static async createAccount(callback = false) {
        const account = utils.accounts.generateAccount();

        if(callback)
            callback(null, account);

        return account;
    }

    async isConnected(callback = false) {
        if(!callback)
            return this.injectPromise(this.isConnected);

        callback(null, {
            fullNode: await this.fullNode.isConnected(),
            solidityNode: await this.solidityNode.isConnected(),
            eventServer: await this.isEventServerConnected()
        });
    }
};