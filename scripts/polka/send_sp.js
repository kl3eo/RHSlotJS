const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

const provider = new WsProvider('wss://rpc.room-house.com/');
const args = require('minimist')(process.argv.slice(2));
const val_arg = args['val'];
const to_arg = args['to'];

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

const jsn = {--copy-paste-json-file--};

const exchangeAddress = '--its-address--';
const exchangePassword = '--and-its-password-of-course--';

const keyring = new Keyring({ type: 'sr25519' });
const alicePair = keyring.createFromJson(jsn);
alicePair.decodePkcs8(exchangePassword);

const val = BigInt(Math.round(parseInt(val_arg)*1000000000000));

const transfer = api.tx.balances.transfer(to_arg, val);

await transfer.signAndSend(alicePair, ({ events = [], status }) => {
            if (status.isInBlock) {
              let success = true
              events.forEach(({ event: { data, method, section }, phase }) => {
                if (method === 'ExtrinsicFailed') success = false
              })
              if (success) {
		console.log(status.asInBlock.toHex());
		process.exit();
              }
            } else if (status.isFinalized) {
              return
	    }
});
}

main().catch(console.error);
