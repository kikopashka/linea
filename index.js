import ccxt from "ccxt"
import winston from 'winston';
import { ethers } from "ethers"
import { general } from "./settings.js"
import fs  from "fs"




export async function withdrawOKX(apiKey, secret, pass, token, amount, address, network){
    try{
    logger.info(`Starting the withdrawal from OKX, amount is ${amount + token}`)
    let networkName = await getNetworkNameOKX(network)
    const provider = new ethers.JsonRpcProvider(general.provider)
    const balanceBefore = await provider.getBalance(address)
    const cexAccount = new ccxt.okx({
        'apiKey': apiKey,
        'secret': secret,
        'password': pass,
        'enableRateLimit': true
    })

        let subAccounts = await cexAccount.privateGetUsersSubaccountList()
        let accs = []
        for(let acc of subAccounts.data){
            accs.push(acc.subAcct)
        }

        for(let acc of accs){
            let subBalances = await cexAccount.privateGetAssetSubaccountBalances({subAcct: acc, currency: token})
            if(subBalances.data.length > 0){
                for(let balances of subBalances.data){
                    if(balances.ccy == token){
                        // nonZeroAccs.push({
                        //     name: acc,
                        //     balances: balances.availBal
                        // })
                        await cexAccount.transfer(token, balances.availBal, 'funding', 'funding', {
                            type: '2',
                            subAcct: acc
                        })
                    }
                }
            }
        }

    
    const chainName = await cexAccount.fetchCurrencies()
    const withdraw = await cexAccount.withdraw(
        token,
        amount,
        address,
        {
            toAddress: address,
            chainName: chainName[token].networks[networkName].id,
            dest: 4,
            fee: chainName[token].networks[networkName].fee,
            pwd: '-',
            amt: amount,
            network: chainName[token].networks[networkName].network

        }
    )
    logger.info(`${amount + token} was withdrawn to the wallet ${address} in ${network}`)
    let balanceAfter
    do{
        logger.info(`Waiting funds in wallet ${address}`)
        balanceAfter = await provider.getBalance(address)
    }while(balanceBefore >= balanceAfter)
    //await delayTx(200, 300)
    }catch(e){
        if(e.name == 'InsufficientFunds'){
            logger.error('Insufficient Funds on OKX account')
            await delayTx(600,1200)
            await withdrawOKX(apiKey, secret, pass, token, amount, address, network)
        }else if (e.name == 'PermissionDenied'){
            logger.error(`OKX IP IS NOT WHITELISTED!!!`)
            await delayTx(600,1200)
            await withdrawOKX(apiKey, secret, pass, token, amount, address, network)
        }else if(e.name == 'InvalidAddress'){
            logger.error('Withdrawal address is not allowlisted')
            await delayTx(600,1200)
            await withdrawOKX(apiKey, secret, pass, token, amount, address, network)
        }else if(e.name == 'ExchangeError'){
            logger.error(`Withdrawals suspended in ${network} network, Waiting 1 hour...`)
            await delayTx(3600,3600)
            await withdrawOKX(apiKey, secret, pass, token, amount, address, network)
        }else{
            logger.error(e)
            await delayTx(120,120)
            await withdrawOKX(apiKey, secret, pass, token, amount, address, network)
        }
    }
}




export async function delayTx(min, max) {           //тут в секундах
    let number = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    //logger.info(`Delay ${number / 1000} seconds after transaction is started...`)
    await delay(number)
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.colorize({
          all: false,
          colors: { error: 'red' } 
        }),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: "logs.log",
        level: "info"
      })
    ]
});



export async function getNetworkNameOKX(networkName){
    let network
    switch(networkName){
      case "arbitrum" : return network = "Arbitrum One"
      case "base" : return network = "Base"
      case "ethereum" : return network = "ERC20"
      case "linea" : return network = "Linea"
      case "optimism" : return network = "Optimism"
      case "zkSync" : return network = "zkSync Era"
    }
}

export async function depositStargate(key, procent){
    const provider = new ethers.JsonRpcProvider(general.provider)
    const wallet = new ethers.Wallet(key, provider)
    const balance = await provider.getBalance(wallet.address)
    const amount = balance * BigInt(procent) /100n
    const abi = [{"inputs":[{"internalType":"address","name":"_stargateEthVault","type":"address"},{"internalType":"address","name":"_stargateRouter","type":"address"},{"internalType":"uint16","name":"_poolId","type":"uint16"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"addLiquidityETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"poolId","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"stargateEthVault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"stargateRouter","outputs":[{"internalType":"contract IStargateRouter","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"address payable","name":"_refundAddress","type":"address"},{"internalType":"bytes","name":"_toAddress","type":"bytes"},{"internalType":"uint256","name":"_amountLD","type":"uint256"},{"internalType":"uint256","name":"_minAmountLD","type":"uint256"}],"name":"swapETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"address payable","name":"_refundAddress","type":"address"},{"internalType":"bytes","name":"_toAddress","type":"bytes"},{"components":[{"internalType":"uint256","name":"amountLD","type":"uint256"},{"internalType":"uint256","name":"minAmountLD","type":"uint256"}],"internalType":"struct RouterETH.SwapAmount","name":"_swapAmount","type":"tuple"},{"components":[{"internalType":"uint256","name":"dstGasForCall","type":"uint256"},{"internalType":"uint256","name":"dstNativeAmount","type":"uint256"},{"internalType":"bytes","name":"dstNativeAddr","type":"bytes"}],"internalType":"struct IStargateRouter.lzTxObj","name":"_lzTxParams","type":"tuple"},{"internalType":"bytes","name":"_payload","type":"bytes"}],"name":"swapETHAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}]
    const stargateContract = new ethers.Contract("0x8731d54e9d02c286767d56ac03e8037c07e01e98", abi, provider)
    const gasPrice = (await provider.getFeeData()).gasPrice
    const txEstimate = await stargateContract.connect(wallet).addLiquidityETH.estimateGas({
        value: amount,
        gasPrice: gasPrice * 103n / 100n
    })
    const tx = await stargateContract.connect(wallet).addLiquidityETH({
        value: amount,
        gasPrice: gasPrice * 103n / 100n,
        gasLimit: txEstimate
    })
    await tx.wait()

    logger.info(`Funds was supplied to Stargate pool - ${ethers.formatUnits(amount, 18)}`)
}




export async function randomDelay(min, max, text) {
    let number = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    logger.info(`Delay ${number / 1000} ${text} started...`)
    await delay(number)
}


export function getRandomNumber(low, high){
    const number = Math.floor(Math.random() * (high - low + 1)) + low;
    return number;
};


export function getRandomAmountCex(low, high) {
    const number = Math.random() * (high - low) + low;
    return Number(number.toFixed(4));
};


fs.writeFileSync('logs.log', '');
const privates = fs.readFileSync("private.txt").toString().replace(/\r\n/g,'\n').split('\n');

for(let i = 0; privates.length > i; i++){
    logger.info(`Starting proccess wallet number ${i+1}`)
    const amount = getRandomAmountCex(general.lowAmount, general.highAmount)
    const provider = new ethers.JsonRpcProvider()
    const wallet = new ethers.Wallet(privates[i], provider)
    await withdrawOKX(general.apiKey, general.secret, general.pass, "ETH", amount, wallet.address, "linea")
    const procentRandom = getRandomNumber(general.minDeposit, general.maxDeposit)
    await depositStargate(privates[i], procentRandom)
    await randomDelay(general.minDelay, general.maxDelay, "after wallet")
}