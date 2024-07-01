import * as dotenv from 'dotenv';
import * as bip39 from 'bip39';
import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import {
  assertIsDeliverTxSuccess,
  SigningStargateClient,
  GasPrice,
  coins,
} from '@cosmjs/stargate';
import * as fs from 'fs';
import * as readline from 'readline';

dotenv.config();

interface Config {
  SDK_VERSION: string;
  COIN_TYPE: string;
  MIN_TX_FEE: number;
  BASE_COIN: string;
  SYMBOL: string;
  EXPONENT: number;
  COINGECKO_ID: string;
  RPC: string;
  PREFIX: string; // Added PREFIX from config.json
}

const config: Config = require('./config.json');

(async () => {
  const wallets = await initWallets();
  console.log(banner());

  const choice = await getUserChoice();

  while (true) {
    for (const wallet of wallets) {
      const balance = await getBalance(wallet);
      console.log(`${config.PREFIX} Current balance: ${balance / (10 ** config.EXPONENT)} ${config.SYMBOL}`);

      if (choice === '1') {
        if (balance >= config.MIN_TX_FEE) {
          await sendTransaction(wallet, await createReceiveAddress());
        } else {
          console.log(`${config.PREFIX} Insufficient funds to send transaction.`);
        }
      } else if (choice === '2') {
        const recipients = await getRecipientsFromFile('recipients.txt');
        for (const recipient of recipients) {
          if (balance >= config.MIN_TX_FEE) {
            await sendTransaction(wallet, recipient);
          } else {
            console.log(`${config.PREFIX} Insufficient funds to send transaction.`);
            break;
          }
        }
      } else if (choice === '3') {
        if (balance > config.MIN_TX_FEE) {
          const recipient = await createReceiveAddress();
          await sendAllBalance(wallet, recipient);
        } else {
          console.log(`${config.PREFIX} Insufficient funds to transfer all balance.`);
        }
      } else if (choice === '4') {
        const numWallets = await getNumberOfWalletsToGenerate();
        await generateWalletsAndSave(numWallets);
      }
    }
    console.log(`${config.PREFIX} Sleeping for 30 seconds...`);
    await sleep(30000);
  }
})();

async function getUserChoice(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${config.PREFIX} Choose recipient method:\n1. Transfer to Generate automatically\n2. Transfer to recipients.txt\n3. Transfer all balance to a generated wallet\n4. Generate wallets and save to wallet.json\n`, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function initWallets(): Promise<OfflineSigner[]> {
  const mnemonics = getMnemonicsFromEnv();
  
  const wallets = await Promise.all(
    mnemonics.map(mnemonic => DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: config.COINGECKO_ID }))
  );

  return wallets;
}

function getMnemonicsFromEnv(): string[] {
  return Object.keys(process.env)
    .filter(key => key.startsWith('MNEMONIC'))
    .map(key => process.env[key] ?? "")
    .filter(mnemonic => mnemonic !== "");
}

async function createReceiveAddress(): Promise<string> {
  const mnemonic = bip39.generateMnemonic();
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: config.COINGECKO_ID });
  const [firstAccount] = await wallet.getAccounts();

  return firstAccount.address;
}

async function getRecipientsFromFile(filePath: string): Promise<string[]> {
  const data = await fs.promises.readFile(filePath, 'utf-8');
  return data.split('\n').filter(line => line.trim() !== '');
}

async function getBalance(wallet: OfflineSigner): Promise<number> {
  const client = await SigningStargateClient.connectWithSigner(config.RPC, wallet);
  const [firstAccount] = await wallet.getAccounts();
  const balance = await client.getBalance(firstAccount.address, config.BASE_COIN);
  return parseInt(balance.amount, 10);
}

async function sendTransaction(wallet: OfflineSigner, recipient: string) {
  const client = await SigningStargateClient.connectWithSigner(
    config.RPC,
    wallet,
    {
      gasPrice: GasPrice.fromString(`${config.MIN_TX_FEE}${config.BASE_COIN}`),
    }
  );

  const amount = coins(1, config.BASE_COIN);
  const [firstAccount] = await wallet.getAccounts();

  console.log(`${config.PREFIX} Send ${config.SYMBOL} from ${firstAccount.address} to ${recipient}`);

  try {
    const transaction = await client.sendTokens(
      firstAccount.address,
      recipient,
      amount,
      "auto"
    );
    assertIsDeliverTxSuccess(transaction);

    console.log(`${config.PREFIX} Successfully broadcasted:`, transaction.transactionHash);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`${config.PREFIX} Failed to send transaction: ${error.message}`);
    } else {
      console.error(`${config.PREFIX} Failed to send transaction:`, error);
    }
  }
}

async function sendAllBalance(wallet: OfflineSigner, recipient: string) {
  const client = await SigningStargateClient.connectWithSigner(
    config.RPC,
    wallet,
    {
      gasPrice: GasPrice.fromString(`${config.MIN_TX_FEE}${config.BASE_COIN}`),
    }
  );

  const [firstAccount] = await wallet.getAccounts();
  const balance = await getBalance(wallet);

  if (balance > config.MIN_TX_FEE) {
    const amount = coins(balance - config.MIN_TX_FEE, config.BASE_COIN); // Subtract transaction fee
    console.log(`${config.PREFIX} Send all ${config.SYMBOL} from ${firstAccount.address} to ${recipient}`);

    try {
      const transaction = await client.sendTokens(
        firstAccount.address,
        recipient,
        amount,
        "auto"
      );
      assertIsDeliverTxSuccess(transaction);

      console.log(`${config.PREFIX} Successfully broadcasted:`, transaction.transactionHash);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`${config.PREFIX} Failed to send all balance: ${error.message}`);
      } else {
        console.error(`${config.PREFIX} Failed to send all balance:`, error);
      }
    }
  } else {
    console.log(`${config.PREFIX} Insufficient funds: ${balance} ${config.SYMBOL} available.`);
  }
}

async function generateWalletsAndSave(numWallets: number) {
  try {
    const walletsData = [];

    for (let i = 0; i < numWallets; i++) {
      const mnemonic = bip39.generateMnemonic();
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: config.COINGECKO_ID });
      const [firstAccount] = await wallet.getAccounts();

      const walletData = {
        mnemonic: mnemonic,
        address: firstAccount.address
      };

      walletsData.push(walletData);
    }

    fs.writeFileSync('wallet.json', JSON.stringify(walletsData, null, 2));
    console.log(`${config.PREFIX} Generated ${numWallets} wallets and saved to wallet.json`);
  } catch (error) {
    console.error(`${config.PREFIX} Failed to generate wallets and save to wallet.json:`, error);
  }
}

async function getNumberOfWalletsToGenerate(): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${config.PREFIX} Enter number of wallets to generate: `, answer => {
      rl.close();
      const numWallets = parseInt(answer.trim());
      resolve(numWallets);
    });
  });
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function banner(): string {
  return `
  ***************************************************
  *              ${config.PREFIX} Cosmos Wallet Manager               *
  ***************************************************
  `;
}
