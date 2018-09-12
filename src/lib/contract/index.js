import TronWeb from 'index';
import utils from 'utils';
import Method from './method';

export default class Contract {
    constructor(tronWeb = false, abi = [], address = false) {
        if(!tronWeb || !tronWeb instanceof TronWeb)
            throw new Error('Expected instance of TronWeb');

        this.tronWeb = tronWeb;
        this.injectPromise = utils.promiseInjector(this);

        this.address = address;
        this.abi = abi;

        this.eventListener = false;
        this.bytecode = false;        
        this.deployed = false;
        this.lastBlock = false;  

        this.methods = {};

        if(this.tronWeb.isAddress(address))
            this.deployed = true;
        else this.address = false;

        this.loadAbi(abi);
    }

    async _getEvents() {
        const events = await this.tronWeb.getEventResult(this.address);
        const [ latestEvent ] = events.sort((a, b) => b.block - a.block);
        const newEvents = events.filter((event, index) => {
            if(!this.lastBlock)
                return true;            

            if(event.block <= this.lastBlock)
                return false;

            // TronGrid is currently bugged and has duplicated the events
            return !events.slice(0, index).some(priorEvent => (
                JSON.stringify(priorEvent) == JSON.stringify(event)
            ));
        });

        if(latestEvent)
            this.lastBlock = latestEvent.block;

        return newEvents;
    }

    async _startEventListener(callback) {
        if(this.eventListener)
            clearInterval(this.eventListener);

        if(!this.tronWeb.eventServer)
            throw new Error('Event server is not configured');

        if(!this.address)
            throw new Error('Contract is not configured with an address');

        this.eventCallback = callback;
        await this._getEvents();

        this.eventListener = setInterval(() => {
            this._getEvents().then(newEvents => newEvents.forEach(event => {
                this.eventCallback && this.eventCallback(event)
            })).catch(err => {
                console.error('Failed to get event list', err);
            });
        }, 3000);
    }

    _stopEventListener() {
        if(!this.eventListener)
            return;

        clearInterval(this.eventListener);
        this.eventListener = false;
        this.eventCallback = false;
    }

    loadAbi(abi) {
        this.abi = abi;
        this.methods = {};

        abi.forEach(func => {
            const method = new Method(this, func);
            const methodCall = method.onMethod.bind(method);

            this.methods[method.name] = methodCall;
            this.methods[method.functionSelector] = methodCall;
            this.methods[method.signature] = methodCall;
        });
    }

    async new(options, privateKey = this.tronWeb.defaultPrivateKey, callback = false) {
        if(utils.isFunction(privateKey)) {
            callback = privateKey;
            privateKey = this.tronWeb.defaultPrivateKey;
        }

        if(!callback)
            return this.injectPromise(this.new, options, privateKey);

        try {
            const address = this.tronWeb.address.fromPrivateKey(privateKey);
            const transaction = await this.tronWeb.transactionBuilder.createSmartContract(options, address);
            const signedTransaction = await this.tronWeb.trx.sign(transaction, privateKey);
            const contract = await this.tronWeb.trx.sendRawTransaction(signedTransaction);

            if(!contract.result)
                return callback('Unknown error: ' + JSON.stringify(contract, null, 2));

            return this.at(signedTransaction.contract_address, callback);
        } catch(ex) {
            return callback(ex);
        }        
    }

    async at(contractAddress, callback = false) {
        if(!callback)
            return this.injectPromise(this.at, contractAddress);

        try {
            const contract = await this.tronWeb.trx.getContract(contractAddress);

            if(!contract.contract_address)
                callback('Unknown error: ' + JSON.stringify(contract, null, 2));

            this.address = contract.contract_address;
            this.bytecode = contract.bytecode;
            this.deployed = true;

            this.loadAbi(contract.abi.entrys);

            callback(null, this);
        } catch(ex) {
            if(ex.toString().includes('does not exist'))
                return callback('Contract has not been deployed on the network');

            return callback(ex);
        }        
    }

    events(callback = false) {
        if(!utils.isFunction(callback))
            throw new Error('Callback function expected');

        const self = this;

        return {
            start(startCallback = false) {
                if(!startCallback) {
                    self._startEventListener(callback);
                    return this;
                }

                self._startEventListener(callback).then(() => {
                    startCallback();
                }).catch(err => {
                    startCallback(err)
                });

                return this;
            },
            stop() {
                self._stopEventListener();
            }
        };
    }
}