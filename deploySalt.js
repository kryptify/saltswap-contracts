const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction;

const Token = require('./build/contracts//SaltToken.json');
const MasterChef = require('./build/contracts//MasterChef.json');
const SmartChef = require('./build/contracts//SmartChef.json');
const ModSalary = require('./build/contracts//ModSalary.json');
// const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json');

const config = require('./config-deploy.json');
require('dotenv').config();

// Export flat:
// npx truffle-flattener contracts/ModSalary.sol > FlatModSalary.sol

const mainAccount = {
    address: process.env.address,
    privateKey: process.env.privateKey,
    web3: new Web3(new Web3.providers.HttpProvider(`https://bsc-dataseed.binance.org/`))
}

const testAccount = {
    address: process.env.addressTest,
    privateKey: process.env.privateKeyTest,
    web3: new Web3(new Web3.providers.HttpProvider(`https://data-seed-prebsc-2-s1.binance.org:8545/`))
}

// Setup web3
const INFURA_API_KEY = config.infuraApiKey;
const NETWORK_ID = config.networkId;

const web3 = testAccount.web3

const TokenContract = new web3.eth.Contract(Token.abi);
const MasterChefContract = new web3.eth.Contract(MasterChef.abi);
const SmartChefContract = new web3.eth.Contract(SmartChef.abi);
const ModSalaryContract = new web3.eth.Contract(ModSalary.abi);
// const ERC20 = new web3.eth.Contract(IERC20.abi);

// setup();

async function setup() {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(mainAccount.address);
    console.log(nonce);
    let balance = await web3.eth.getBalance(mainAccount.address);
    console.log(balance);

    deployTokenContract(accountData, nonce);
}

async function deployTokenContract(account, nonce) {
    TokenContract.deploy({
        data: Token.bytecode,
    })
        .send({
            nonce: web3.utils.toHex(nonce++),
            from: account.address,
            gas: web3.utils.toHex(config.gasLimit),
            gasPrice: web3.utils.toHex(config.gasPrice),
        })
        .then((newContractInstance) => {
            console.log(`Token contract deployed at ${newContractInstance.options.address}`);
            // setUniswapPool(newContractInstance.options.address, account, ++nonce);
            // unpause(newContractInstance.options.address, account, ++nonce);
            deployMasterChef(newContractInstance.options.address, account.address, nonce);
        });
}

async function deployMasterChef(tokenContractAddress, account, nonce) {
    const web3 = account.web3
    const saltPerBlock = web3.utils.toWei('1', 'ether');

    MasterChefContract.deploy({
        data: MasterChef.bytecode,
        arguments: [tokenContractAddress, account.address, account.address, saltPerBlock, 6347879]
    })
        .send({
            nonce: web3.utils.toHex(nonce++),
            from: accountData.address,
            gas: web3.utils.toHex(config.gasLimit),
            gasPrice: web3.utils.toHex(config.gasPrice),
        })
        .then((newContractInstance) => {
            console.log(`MasterChef contract deployed at ${newContractInstance.options.address}`);

            // SALT 4x 0% deposit fee
            add(newContractInstance.options.address, 4000, tokenContractAddress, 0, true, account, nonce++);

            // unpause(newContractInstance.options.address, account, ++nonce);
            // deployCrowdsaleContract(newContractInstance.options.address, account, nonce++);
        });
}

async function add(masterChefAddress, allocPoint, lpTokenAddress, depositFee, withUpdate, account, nonce) {
    const web3 = account.web3
    // function add(uint256 _allocPoint, IBEP20 _lpToken, uint16 _depositFeeBP, bool _withUpdate) public onlyOwner {
    const txOptions = {
        nonce: web3.utils.toHex(nonce),
        from: account.address,
        to: masterChefAddress,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: MasterChefContract.methods.add(allocPoint, lpTokenAddress, depositFee, withUpdate).encodeABI()
    }
    const signed = await web3.eth.accounts.signTransaction(txOptions, account.privateKey);
    web3.eth.sendSignedTransaction(signed.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
        });
}

 // setupSmartChef()

async function setupSmartChef() {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    const SALTaddress = "0x2849b1ae7e04a3d9bc288673a92477cf63f28af4" // main net
    const rewardToken = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82" // CAKE
    const rewardAmount = web3.utils.toWei('1021.756438264728825725', 'ether');
    const rewardPerBlock = web3.utils.toWei('0.00295', 'ether');


     deploySmartChef(SALTaddress, rewardToken, rewardAmount, rewardPerBlock, account, nonce);

    // deploy a new SALT Token
    /* TokenContract.deploy({
        data: Token.bytecode,
    })
        .send({
            nonce: web3.utils.toHex(nonce++),
            from: mainAccount.address,
            gas: web3.utils.toHex(config.gasLimit),
            gasPrice: web3.utils.toHex(config.gasPrice),
        })
        .then((saltContractAddress) => {
            console.log(`Token contract deployed at ${saltContractAddress.options.address}`);
            deploySmartChef(saltContractAddress.options.address, rewardToken, rewardAmount, rewardPerBlock, account, nonce);
        }); */
}

async function deploySmartChef(tokenContractAddress, rewardTokenAddress, rewardAmount, rewardPerBlock, account, nonce) {
    const startBlock = 5212526
    const endBlock = startBlock + Math.floor(rewardAmount / rewardPerBlock)
    console.log("startblock:", startBlock)
    console.log("endBlock:", endBlock)

    // deploy SmartChef
    SmartChefContract.deploy({
        data: SmartChef.bytecode,
        arguments: [tokenContractAddress, rewardTokenAddress, rewardPerBlock, startBlock, endBlock]
    })
        .send({
            nonce: web3.utils.toHex(nonce++),
            from: account.address,
            gas: web3.utils.toHex(config.gasLimit),
            gasPrice: web3.utils.toHex(config.gasPrice),
        })
        .then((newContractInstance) => {
            console.log(`SmartChef contract deployed at ${newContractInstance.options.address}`);
            // now we need to deposit rewardTokenAddress
            sendRewardTokenToSmartChef(newContractInstance.options.address, rewardTokenAddress, rewardAmount)
        });
}

async function sendRewardTokenToSmartChef(smartChef, rewardToken, amountToSend) {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    // send to smartchef the reward token
    const txOptions2 = {
        nonce: web3.utils.toHex(nonce),
        from: accountData.address,
        to: rewardToken,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: TokenContract.methods.transfer(smartChef, amountToSend).encodeABI()
    }
    const signed2 = await web3.eth.accounts.signTransaction(txOptions2, account.privateKey);
    web3.eth.sendSignedTransaction(signed2.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('reward token sent to SmartChef: ', amountToSend);
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
        });
}

 // startSmartFarming()

async function startSmartFarming() {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    const SALTaddress = "0x569FCb5d25C126F9b68405fFbB20D069768f0780"
    const smartChef = "0xd53186ADd1fc44cB57D13A7482a53eDDf7e48970"

    const approvedAmount = web3.utils.toWei('100000', 'ether');
    // Approve smartchef to get SALT
    const txOptions = {
        nonce: web3.utils.toHex(nonce),
        from: mainAccount.address,
        to: SALTaddress,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: TokenContract.methods.approve(smartChef, approvedAmount).encodeABI()
    }
    const signed = await web3.eth.accounts.signTransaction(txOptions, account.privateKey);
    web3.eth.sendSignedTransaction(signed.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
            depositSaltToSmartChef(smartChef)
        });
}

async function depositSaltToSmartChef(smartChef) {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    // deposit SALT to smartchef
    const SALTtoSend = web3.utils.toWei('0.1', 'ether');
    const txOptions2 = {
        nonce: web3.utils.toHex(nonce),
        from: mainAccount.address,
        to: smartChef,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: SmartChefContract.methods.deposit(SALTtoSend).encodeABI()
    }
    const signed2 = await web3.eth.accounts.signTransaction(txOptions2, account.privateKey);
    web3.eth.sendSignedTransaction(signed2.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
        });

}


  setupModSalary()

 async function setupModSalary() {
    const accountData = testAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    const SALTaddress = "0x85582d24455caaf44fc4f914bdca2a6cb73e6681" // test net

    deployModSalary(SALTaddress, account, nonce);
}

async function deployModSalary(paymentTokenAddress, account, nonce) {
    // deploy ModSalary
    ModSalaryContract.deploy({
        data: ModSalary.bytecode,
        arguments: [paymentTokenAddress]
    })
        .send({
            nonce: web3.utils.toHex(nonce++),
            from: account.address,
            gas: web3.utils.toHex(config.gasLimit),
            gasPrice: web3.utils.toHex(config.gasPrice),
        })
        .then((newContractInstance) => {
            console.log(`ModSalary contract deployed at ${newContractInstance.options.address}`);
        });
}