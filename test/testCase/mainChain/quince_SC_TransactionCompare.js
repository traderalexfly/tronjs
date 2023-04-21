const {testRevert, testConstant, arrayParam, tronToken, testAddressArray, trcTokenTest070, trcTokenTest059, funcABIV2, funcABIV2_2, funcABIV2_3, funcABIV2_4, abiV2Test1,abiV2Test2, testSetVal,
    testEmptyAbi
} = require('../util/contracts');
const assertThrow = require('../util/assertThrow');
const broadcaster = require('../util/broadcaster');
const pollAccountFor = require('../util/pollAccountFor');
const tronWebBuilder = require('../util/tronWebBuilder');
const assertEqualHex = require('../util/assertEqualHex');
const waitChainData = require('../util/waitChainData');
const publicMethod = require('../util/PublicMethod');
const txPars = require('../util/txPars');
const wait = require('../util/wait');
const jlog = require('../util/jlog');
const util = require('util');
const chai = require('chai');
const assert = chai.assert;
const _ = require('lodash');
const TronWeb = tronWebBuilder.TronWeb;
const {
    ADDRESS_HEX,
    ADDRESS_BASE58,
    UPDATED_TEST_TOKEN_OPTIONS,
    WITNESS_ACCOUNT,
    WITNESS_KEY,
    PRIVATE_KEY,
    getTokenOptions,
    isProposalApproved,
    TOKEN_ID,
    FEE_LIMIT
} = require('../util/config');
const { equals, getValues } = require('../util/testUtils');


describe('TronWeb.transactionBuilder', function () {

    let accounts;
    let tronWeb;
    let emptyAccount;

    before(async function () {
        emptyAccount = await TronWeb.createAccount();
        tronWeb = tronWebBuilder.createInstance();
        //account0_hex = "4199401720e0f05456f60abc65fca08696fa698ee0";
        //account0_b58 = "TPwXAV3Wm25x26Q6STrFYCDMM4F59UhXL7";
        await tronWebBuilder.newTestAccountsInMain(29);
        accounts = await tronWebBuilder.getTestAccountsInMain(29);

    });

    describe("#createSmartContract", async function () {
            it('should create a smart contract with default parameters', async function () {
                const options = {
                    abi: testRevert.abi,
                    bytecode: testRevert.bytecode,
                    feeLimit: 1000000000,
                    originEnergyLimit: 10000000,
                    name: tronWeb.fromUtf8('TestRevert'),
                    callValue: 0,
                    userFeePercentage: 0
                };
                const data = {
                               owner_address: tronWeb.defaultAddress.hex,
                               abi: testRevert.abi,
                               bytecode: testRevert.bytecode,
                               fee_limit: 1000000000,
                               origin_energy_limit: 10000000,
                               name: tronWeb.fromUtf8("TestRevert"),
                               call_value: 0,
                               consume_user_resource_percent: 0,
                               visible: false
                                };


                tx1 = await tronWeb.fullNode.request('wallet/deploycontract', data, 'post');
                console.log('TronGrid ', JSON.stringify(tx1, null, 2));
                const tx2 = await tronWeb.transactionBuilder.createSmartContract(options,tronWeb.defaultAddress.hex, tx1)
                console.log('TronWeb ', JSON.stringify(tx2, null, 2));
                result = await broadcaster.broadcaster(null, tronWeb.defaultAddress.privateKey, tx2);
                console.log("result: ",result)
                while (true) {
                                                const tx = await tronWeb.trx.getTransactionInfo(tx2.txID);
                                                if (Object.keys(tx).length === 0) {
                                                    await wait(3);
                                                    continue;
                                                } else {
                                                    break;
                                                }
                               }

                if (!_.isEqual(tx1,tx2)) {
                          console.error('smart contract with default parameters not equal');
                          //console.log(JSON.stringify(tx1.raw_data.contract[0].parameter.value, null, 2));
                          //console.log(JSON.stringify(tx2.raw_data.contract[0].parameter.value, null, 2));

                } else {
                          console.info('smart contract with default parameters goes well');
                }

            });

            it('should create a smart contract with array parameters', async function () {
                this.timeout(20000);
                const bals = [1000, 2000, 3000, 4000];
                const options = {
                    abi: arrayParam.abi,
                    bytecode: arrayParam.bytecode,
                    fee_limit: 1000000000,
                    origin_energy_limit: 10000000,
                    name: tronWeb.fromUtf8('ArrayParam'),
                    callValue: 0,
                    userFeePercentage: 0,
                    permissionId: 2,
                    parameters: [
                        [accounts.hex[16], accounts.hex[17], accounts.hex[18], accounts.hex[19]],
                        [bals[0], bals[1], bals[2], bals[3]]
                    ],

                };
                const data = {
                     owner_address: accounts.hex[0],
                     abi: arrayParam.abi,
                     bytecode: arrayParam.bytecode,
                     fee_limit: 1000000000,
                     origin_energy_limit: 10000000,
                     name: tronWeb.fromUtf8("ArrayParam"),
                     call_value: 0,
                     consume_user_resource_percent: 0,
                     visible: false,
                     Permission_id: 2,
                     parameter: [
                                             [accounts.hex[16], accounts.hex[17], accounts.hex[18], accounts.hex[19]],
                                             [bals[0], bals[1], bals[2], bals[3]]
                                 ],
                };
                tx1 = await tronWeb.fullNode.request('wallet/deploycontract', data, 'post');
                console.log('TronGrid ', JSON.stringify(tx1, null, 2));
                const tx2 = await tronWeb.transactionBuilder.createSmartContract(options, accounts.hex[0],tx1);
                console.log('TronWeb ', JSON.stringify(tx2, null, 2));
                const result = await broadcaster.broadcaster(null, accounts.pks[0], tx2);
                console.log('Result ', JSON.stringify(result, null, 2));
                while (true) {
                    const tx = await tronWeb.trx.getTransactionInfo(tx2.txID);
                    if (Object.keys(tx).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }

                const deployed = await tronWeb.contract().at(transaction.contract_address);
                for (let j = 16; j <= 19; j++) {
                    let bal = await deployed.balances(accounts.hex[j]).call();
                    bal = bal.toNumber();
                    assert.equal(bal, bals[j - 16]);
                }

                if (!_.isEqual(tx1,tx2)) {
                                          console.error('smart contract with ArrayParam not equal');
                                          console.log(JSON.stringify(tx1.raw_data.contract[0].parameter.value, null, 2));
                                          console.log(JSON.stringify(tx2.raw_data.contract[0].parameter.value, null, 2));

                                    } else {
                                          console.info('smart contract with ArrayParam goes well');
                                    }

            });

            /*it('should create a smart contract with array[3] parameters', async function () {
                const options = {
                    abi: testAddressArray.abi,
                    bytecode: testAddressArray.bytecode,
                    permissionId: 2,
                    parameters: [
                        [accounts.hex[16], accounts.hex[17], accounts.hex[18]]
                    ]
                };
                const transaction = await tronWeb.transactionBuilder.createSmartContract(options, accounts.hex[0]);
                await broadcaster.broadcaster(null, accounts.pks[0], transaction);
                while (true) {
                    const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                    if (Object.keys(tx).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }
                const deployed = await tronWeb.contract().at(transaction.contract_address);
                for (let j = 16; j <= 18; j++) {
                    let bal = await deployed.balanceOf(accounts.hex[j]).call();
                    bal = bal.toNumber();
                    assert.equal(bal, 100000000);
                }
            });

            it('should create a smart contract with trctoken and stateMutability parameters', async function () {
                // before token balance
                const accountbefore = await tronWeb.trx.getAccount(ADDRESS_HEX);
                const accountTrc10BalanceBefore = accountbefore.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
                console.log("accountTrc10BalanceBefore:"+accountTrc10BalanceBefore);
                const options = {
                    abi: trcTokenTest070.abi,
                    bytecode: trcTokenTest070.bytecode,
                    parameters: [
                        accounts.hex[16], TOKEN_ID, 123
                    ],
                    callValue:321,
                    tokenId:TOKEN_ID,
                    tokenValue:1e3,
                    feeLimit: FEE_LIMIT
                };
                const transaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_HEX);
                await broadcaster.broadcaster(null, PRIVATE_KEY, transaction);
                let createInfo
                while (true) {
                    createInfo = await tronWeb.trx.getTransactionInfo(transaction.txID);
                    if (Object.keys(createInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }

                // after token balance
                const accountAfter = await tronWeb.trx.getAccount(ADDRESS_HEX);
                const accountTrc10BalanceAfter = accountAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
                console.log("accountTrc10BalanceAfter:"+accountTrc10BalanceAfter);
                const toAddressAfter = await tronWeb.trx.getAccount(accounts.hex[16]);
                const toAddressTrc10BalanceAfter = toAddressAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
                console.log("toAddressTrc10BalanceAfter:"+toAddressTrc10BalanceAfter);
                assert.equal(accountTrc10BalanceAfter,(accountTrc10BalanceBefore-1e3));
                assert.equal(toAddressTrc10BalanceAfter,123);
            });

            it('should create a smart contract with payable parameters', async function () {
                // before token balance
                const accountbefore = await tronWeb.trx.getAccount(ADDRESS_HEX);
                const accountTrc10BalanceBefore = accountbefore.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
                console.log("accountTrc10BalanceBefore:"+accountTrc10BalanceBefore);
                const options = {
                    abi: trcTokenTest059.abi,
                    bytecode: trcTokenTest059.bytecode,
                    parameters: [
                        accounts.hex[13], TOKEN_ID, 123
                    ],
                    callValue:321,
                    tokenId:TOKEN_ID,
                    tokenValue:1e3
                };
                const transaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_HEX);
                await broadcaster.broadcaster(null, PRIVATE_KEY, transaction);
                let createInfo
                while (true) {
                    createInfo = await tronWeb.trx.getTransactionInfo(transaction.txID);
                    if (Object.keys(createInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }

                // after token balance
                const accountAfter = await tronWeb.trx.getAccount(ADDRESS_HEX);
                const accountTrc10BalanceAfter = accountAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
                console.log("accountTrc10BalanceAfter:"+accountTrc10BalanceAfter);
                const toAddressAfter = await tronWeb.trx.getAccount(accounts.hex[13]);
                const toAddressTrc10BalanceAfter = toAddressAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
                console.log("toAddressTrc10BalanceAfter:"+toAddressTrc10BalanceAfter);
                assert.equal(accountTrc10BalanceAfter,(accountTrc10BalanceBefore-1e3));
                assert.equal(toAddressTrc10BalanceAfter,123);
            });

            it('should create a smart contract and verify the parameters', async function () {

                const options = {
                    abi: testRevert.abi,
                    bytecode: testRevert.bytecode,
                    userFeePercentage: 30,
                    originEnergyLimit: 9e6,
                    feeLimit: 9e8
                };
                for (let i = 0; i < 2; i++) {
                    if (i === 1) options.permissionId = 2;
                    const tx = await tronWeb.transactionBuilder.createSmartContract(options)
                    assert.equal(tx.raw_data.contract[0].parameter.value.new_contract.consume_user_resource_percent, 30);
                    assert.equal(tx.raw_data.contract[0].parameter.value.new_contract.origin_energy_limit, 9e6);
                    assert.equal(tx.raw_data.fee_limit, 9e8);
                    assert.equal(tx.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
                }
            });*/
        });

    describe.only("#triggerSmartContractWithFuncABIV2 (V2 input)", async function () {

            it('should create or trigger a smart contract with funcABIV2 (V2 input)', async function () {
                let coder = tronWeb.utils.abi;
                const issuerAddress = accounts.hex[0];
                const issuerPk = accounts.pks[0];
                const abi = JSON.parse(funcABIV2_2.interface);
                const bytecode = funcABIV2_2.bytecode;
                const outputValues = getValues(JSON.parse(funcABIV2_2.values))
                const transaction = await tronWeb.transactionBuilder.createSmartContract(
                    {
                        abi,
                        bytecode,
                    },
                    issuerAddress
                );
                await broadcaster.broadcaster(null, issuerPk, transaction);
                while (true) {
                    const tx = await tronWeb.trx.getTransactionInfo(
                        transaction.txID
                    );
                    if (Object.keys(tx).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }

                const deployed = await tronWeb
                    .contract(abi, transaction.contract_address)
                let check = await deployed.test().call();
                assert.ok(equals(check[0], outputValues[0]));
            });
    });

    describe('#updateSetting()', function () {
            let transaction;
                before(async function () {
                    this.timeout(20000);

                    transaction = await tronWeb.transactionBuilder.createSmartContract({
                        abi: testConstant.abi,
                        bytecode: testConstant.bytecode
                    }, accounts.hex[3]);
                    await broadcaster.broadcaster(null, accounts.pks[3], transaction);
                    while (true) {
                        const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                        if (Object.keys(tx).length === 0) {
                            await wait(3);
                            continue;
                        } else {
                            break;
                        }
                    }
                })
                it(`should update setting`, async function () {

                     data = {
                                    //owner_address: this.tronWeb.defaultAddress.base58,
                                    owner_address: accounts.hex[3],
                                    contract_address: transaction.contract_address,
                                    consume_user_resource_percent: 10,
                                    visible: false,
                                    Permission_id: 2
                             };
                     tx1 = await tronWeb.fullNode.request('wallet/updatesetting', data, 'post');
                     console.log('TronGrid ', JSON.stringify(tx1, null, 2));
                     param = [transaction.contract_address,10,accounts.hex[3],{permissionId: 2},tx1];
                     const tx2 = await tronWeb.transactionBuilder.updateSetting(...param);
                     console.log('TronWeb ',JSON.stringify(tx2, null, 2));
                     if (!_.isEqual(tx1,tx2)) {
                            console.error('updateSetting not equal');
                            console.log(JSON.stringify(tx2.raw_data.contract[0].parameter.value, null, 2));
                            console.log(JSON.stringify(tx1.raw_data.contract[0].parameter.value, null, 2));
                     } else {
                            console.info('updateSetting goes well');
                     }
                });
        });

    describe("#updateEnergyLimit", function () {
                let transaction;
                before(async function () {
                    this.timeout(20000);

                    transaction = await tronWeb.transactionBuilder.createSmartContract({
                        abi: testConstant.abi,
                        bytecode: testConstant.bytecode
                    }, accounts.hex[3]);
                    await broadcaster.broadcaster(null, accounts.pks[3], transaction);
                    while (true) {
                        const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                        if (Object.keys(tx).length === 0) {
                            await wait(3);
                            continue;
                        } else {
                            break;
                        }
                    }
                })
                it(`should update energy limit`, async function () {
                    const data = {
                                    owner_address: accounts.hex[3],
                                    contract_address: transaction.contract_address,
                                    origin_energy_limit: 10e6,
                                    visible: false,
                                    Permission_id: 2
                                 }
                    tx1 = await tronWeb.fullNode.request('wallet/updatesetting', data, 'post');
                    console.log('TronGrid ', JSON.stringify(tx1, null, 2));
                    const param = [transaction.contract_address, 10e6, accounts.b58[3], { permissionId: 2 }, tx1];
                    const tx2 = await tronWeb.transactionBuilder.updateEnergyLimit(...param);
                    console.log('TronWeb ', JSON.stringify(tx2, null, 2));
                    const authResult =TronWeb.utils.transaction.txCheck(tx2);
                    assert.equal(authResult, true);

                    if (!_.isEqual(tx1,tx2)) {
                                                console.error('updateEnergyLimit not equal');
                                                console.log(JSON.stringify(tx1.raw_data.contract[0].parameter.value, null, 2));
                                                console.log(JSON.stringify(tx2.raw_data.contract[0].parameter.value, null, 2));
                                         } else {
                                                console.info('updateEnergyLimit goes well');
                                         }
                });
            });

    describe("#vote", async function () {
                    let url = 'https://xtron.network';
                    before(async function () {
                        /**
                         * Execute this method when Proposition 70 is not enabled
                         */
                        //await broadcaster.broadcaster(tronWeb.transactionBuilder.freezeBalance(100e6, 3, 'BANDWIDTH', accounts.b58[11]), accounts.pks[11])
                        param = [100000000,3,'BANDWIDTH', accounts.b58[11]];
                        const transaction = await tronWeb.transactionBuilder.freezeBalance(...param);
                        const result = await broadcaster.broadcaster(null,accounts.pks[11],transaction);
                        console.log("result ",result);

                        /**
                         * Execute this method when Proposition 70 is enabled
                         */
                        /*param = [100000000, 'BANDWIDTH', accounts.b58[11]];
                        const transaction = await tronWeb.transactionBuilder.freezeBalanceV2(...param);
                        const result = await broadcaster.broadcaster(null,accounts.pks[11],transaction);
                        console.log("result ",result);*/
                        while (true) {
                                                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                                                if (Object.keys(tx).length === 0) {
                                                    await wait(3);
                                                    continue;
                                                } else {
                                                    break;
                                                }
                                            }

                    })


                    it('should allows accounts[1] to vote for accounts[0] as SR', async function () {
                        const data = {
                            owner_address: accounts.hex[11],
                            votes: [
                                {   vote_address: tronWeb.address.toHex(WITNESS_ACCOUNT),
                                    vote_count: 5
                                }
                            ],
                            visible: false

                        }
                        tx1 = await tronWeb.fullNode.request('wallet/votewitnessaccount', data, 'post');
                        console.log('TronGrid ', JSON.stringify(tx1, null, 2));
                        let votes = {}
                        votes[tronWeb.address.toHex(WITNESS_ACCOUNT)] = 5
                        const tx2 = await tronWeb.transactionBuilder.vote(votes, accounts.b58[11],tx1)
                        console.log('TronWeb ', JSON.stringify(tx2, null, 2));
                        const parameter = txPars(tx2);

                        assert.equal(parameter.value.owner_address, accounts.hex[11]);
                        assert.equal(parameter.value.votes[0].vote_address, tronWeb.address.toHex(WITNESS_ACCOUNT));
                        assert.equal(parameter.value.votes[0].vote_count, 5);
                        assert.equal(parameter.type_url, 'type.googleapis.com/protocol.VoteWitnessContract');

                        if (!_.isEqual(tx1,tx2)) {
                                                                        console.error('vote not equal');
                                                                        console.log(JSON.stringify(tx1.raw_data.contract[0].parameter.value, null, 2));
                                                                        console.log(JSON.stringify(tx2.raw_data.contract[0].parameter.value, null, 2));
                                                  } else {
                                                                        console.info('vote goes well');
                                                  }

                    })

    });





});

