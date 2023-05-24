const { ApiPromise, WsProvider } = require('@polkadot/api');

const provider = new WsProvider('wss://rpc.room-house.com/');
const args = require('minimist')(process.argv.slice(2));
const blockHash_arg = args['bh'];
const txHash_arg = args['th'];

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

const B = "0x" + String(blockHash_arg);
const T = "0x" + String(txHash_arg);

const signedBlock = await api.rpc.chain.getBlock(B);
var n = 0;
let i = 0;
let which = 0;

signedBlock.block.extrinsics.forEach((ex, index) => {
  const { isSigned, meta, method: { args, method, section } } = ex;
  const txH = ex.hash.toHex();
  if (txH === T && method === 'transfer' && section === 'balances') { n = `${args[1]}`; which = i;}
  ++i;
});

const signer = JSON.stringify(signedBlock.block.extrinsics[which].toHuman().signer, null, 2);
// console.log('signer', signer, 'n', n);

if (n == 5000000000000 || n == 50000000000000) {console.log(signer)} else {console.log('0')}
process.exit(0);
}

main().catch(console.error);
