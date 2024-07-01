# Winsnip Cosmos Wallet Manager

A TypeScript script for managing Cosmos wallets, enabling transactions and wallet generation.
![Nama Alternatif](https://github.com/Winnode/IBC-Wallet/blob/main/sc.png)


## Features

- **Transaction Management**: Send transactions to recipients or generate new wallets.
- **Wallet Generation**: Generate multiple wallets and save them to a JSON file.
- **Interactive CLI**: Choose transaction methods and manage wallets interactively.

## Installation

1. **Node.js**: Ensure Node.js is installed. You can download it from [nodejs.org](https://nodejs.org/).

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   source ~/.bashrc
   nvm install 14
   nvm use 14
   ```

2. **Clone Repository**:
   ```bash
   git clone https://github.com/Winnode/IBC-Wallet.git
   cd IBC-Wallet

3. **Install**:

   ```bash
   npm install
   ```  
   or
    ```bash  
   npm install dotenv bip39 @cosmjs/proto-signing @cosmjs/stargate fs readline randombytes base64-arraybuffer
   ``` 

3. **Creat File .env**:

    ```bash 
   nano .env
   ```
    
   ```bash  
   MNEMONIC1="xxx"
   MNEMONIC2="xxx"
   ```

4. **Run**:

   ```bash
   npm start
   ```  
   or
    ```bash  
   node run
   ``` 

5. **Support (EVM for coffee)**:
    ```bash
   0xde260429ef7680c7a43e855b5fcf619948f34e2a
   ``` 
