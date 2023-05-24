const { ApiPromise, WsProvider } = require('@polkadot/api');

const provider = new WsProvider('wss://rpc.room-house.com/');

async function main () {
  const api = await ApiPromise.create(
{provider, types: {
"Address": "AccountId",
"LookupSource": "AccountId",
"Account": {
"nonce": "U256",
"balance": "U256"
},
"Transaction": {
"nonce": "U256",
"action": "String",
"gas_price": "u64",
"gas_limit": "u64",
"value": "U256",
"input": "Vec",
"signature": "Signature"
},
"Signature": {
"v": "u64",
"r": "H256",
"s": "H256"
},
"Keys": "SessionKeys5"
}
});

let count = 0;

const unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
    //console.log(`Chain is at block: #${header.number}`);
    console.log(`${header.number}`);

    if (++count === 1) {
      unsubscribe();
      process.exit(0);
    }
});

}

main().catch(console.error);
