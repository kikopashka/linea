import ccxt  from "ccxt"
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

export async function stakeStargate(key){
    const provider = new ethers.JsonRpcProvider(general.provider)
    const wallet = new ethers.Wallet(key, provider)
    const ERC20ABI = [{"inputs":[{"internalType":"uint256","name":"_poolId","type":"uint256"},{"internalType":"address","name":"_router","type":"address"},{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_sharedDecimals","type":"uint256"},{"internalType":"uint256","name":"_localDecimals","type":"uint256"},{"internalType":"address","name":"_feeLibrary","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountLP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"dstChainId","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"dstPoolId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"weight","type":"uint256"}],"name":"ChainPathUpdate","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"chainId","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"srcPoolId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"idealBalance","type":"uint256"}],"name":"CreditChainPath","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"batched","type":"bool"},{"indexed":false,"internalType":"uint256","name":"swapDeltaBP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpDeltaBP","type":"uint256"},{"indexed":false,"internalType":"bool","name":"defaultSwapMode","type":"bool"},{"indexed":false,"internalType":"bool","name":"defaultLPMode","type":"bool"}],"name":"DeltaParamUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"feeLibraryAddr","type":"address"}],"name":"FeeLibraryUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"mintFeeBP","type":"uint256"}],"name":"FeesUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountLP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"},{"indexed":false,"internalType":"address","name":"to","type":"address"}],"name":"InstantRedeemLocal","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountLP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"mintFeeAmountSD","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountLP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"},{"indexed":false,"internalType":"uint16","name":"chainId","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"dstPoolId","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"to","type":"bytes"}],"name":"RedeemLocal","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"_to","type":"address"},{"indexed":false,"internalType":"uint256","name":"_amountSD","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_amountToMintSD","type":"uint256"}],"name":"RedeemLocalCallback","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"chainId","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"dstPoolId","type":"uint256"},{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountLP","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"}],"name":"RedeemRemote","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"dstChainId","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"dstPoolId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"credits","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"idealBalance","type":"uint256"}],"name":"SendCredits","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"swapStop","type":"bool"}],"name":"StopSwapUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"chainId","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"dstPoolId","type":"uint256"},{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"eqReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"eqFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"protocolFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpFee","type":"uint256"}],"name":"Swap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"protocolFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dstFee","type":"uint256"}],"name":"SwapRemote","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"}],"name":"WithdrawMintFeeBalance","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountSD","type":"uint256"}],"name":"WithdrawProtocolFeeBalance","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"srcChainId","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"srcPoolId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"swapAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"mintAmount","type":"uint256"}],"name":"WithdrawRemote","type":"event"},{"inputs":[],"name":"BP_DENOMINATOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"}],"name":"activateChainPath","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amountLP","type":"uint256"}],"name":"amountLPtoLD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"batched","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_fullMode","type":"bool"}],"name":"callDelta","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"","type":"uint16"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"chainPathIndexLookup","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"chainPaths","outputs":[{"internalType":"bool","name":"ready","type":"bool"},{"internalType":"uint16","name":"dstChainId","type":"uint16"},{"internalType":"uint256","name":"dstPoolId","type":"uint256"},{"internalType":"uint256","name":"weight","type":"uint256"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"lkb","type":"uint256"},{"internalType":"uint256","name":"credits","type":"uint256"},{"internalType":"uint256","name":"idealBalance","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"convertRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"},{"internalType":"uint256","name":"_weight","type":"uint256"}],"name":"createChainPath","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"},{"components":[{"internalType":"uint256","name":"credits","type":"uint256"},{"internalType":"uint256","name":"idealBalance","type":"uint256"}],"internalType":"struct Pool.CreditObj","name":"_c","type":"tuple"}],"name":"creditChainPath","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"defaultLPMode","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"defaultSwapMode","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"deltaCredit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"eqFeePool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feeLibrary","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"}],"name":"getChainPath","outputs":[{"components":[{"internalType":"bool","name":"ready","type":"bool"},{"internalType":"uint16","name":"dstChainId","type":"uint16"},{"internalType":"uint256","name":"dstPoolId","type":"uint256"},{"internalType":"uint256","name":"weight","type":"uint256"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"lkb","type":"uint256"},{"internalType":"uint256","name":"credits","type":"uint256"},{"internalType":"uint256","name":"idealBalance","type":"uint256"}],"internalType":"struct Pool.ChainPath","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getChainPathsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amountLP","type":"uint256"},{"internalType":"address","name":"_to","type":"address"}],"name":"instantRedeemLocal","outputs":[{"internalType":"uint256","name":"amountSD","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"localDecimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lpDeltaBP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amountLD","type":"uint256"}],"name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"mintFeeBP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"mintFeeBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"poolId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"protocolFeeBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amountLP","type":"uint256"},{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"},{"internalType":"bytes","name":"_to","type":"bytes"}],"name":"redeemLocal","outputs":[{"internalType":"uint256","name":"amountSD","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"_srcChainId","type":"uint16"},{"internalType":"uint256","name":"_srcPoolId","type":"uint256"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amountSD","type":"uint256"},{"internalType":"uint256","name":"_amountToMintSD","type":"uint256"}],"name":"redeemLocalCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"_srcChainId","type":"uint16"},{"internalType":"uint256","name":"_srcPoolId","type":"uint256"},{"internalType":"uint256","name":"_amountSD","type":"uint256"}],"name":"redeemLocalCheckOnRemote","outputs":[{"internalType":"uint256","name":"swapAmount","type":"uint256"},{"internalType":"uint256","name":"mintAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"},{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amountLP","type":"uint256"}],"name":"redeemRemote","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"router","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"}],"name":"sendCredits","outputs":[{"components":[{"internalType":"uint256","name":"credits","type":"uint256"},{"internalType":"uint256","name":"idealBalance","type":"uint256"}],"internalType":"struct Pool.CreditObj","name":"c","type":"tuple"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_batched","type":"bool"},{"internalType":"uint256","name":"_swapDeltaBP","type":"uint256"},{"internalType":"uint256","name":"_lpDeltaBP","type":"uint256"},{"internalType":"bool","name":"_defaultSwapMode","type":"bool"},{"internalType":"bool","name":"_defaultLPMode","type":"bool"}],"name":"setDeltaParam","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_mintFeeBP","type":"uint256"}],"name":"setFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_feeLibraryAddr","type":"address"}],"name":"setFeeLibrary","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_swapStop","type":"bool"}],"name":"setSwapStop","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"},{"internalType":"uint16","name":"_weight","type":"uint16"}],"name":"setWeightForChainPath","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"sharedDecimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"stopSwap","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"_dstChainId","type":"uint16"},{"internalType":"uint256","name":"_dstPoolId","type":"uint256"},{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amountLD","type":"uint256"},{"internalType":"uint256","name":"_minAmountLD","type":"uint256"},{"internalType":"bool","name":"newLiquidity","type":"bool"}],"name":"swap","outputs":[{"components":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"eqFee","type":"uint256"},{"internalType":"uint256","name":"eqReward","type":"uint256"},{"internalType":"uint256","name":"lpFee","type":"uint256"},{"internalType":"uint256","name":"protocolFee","type":"uint256"},{"internalType":"uint256","name":"lkbRemove","type":"uint256"}],"internalType":"struct Pool.SwapObj","name":"","type":"tuple"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"swapDeltaBP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"_srcChainId","type":"uint16"},{"internalType":"uint256","name":"_srcPoolId","type":"uint256"},{"internalType":"address","name":"_to","type":"address"},{"components":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"eqFee","type":"uint256"},{"internalType":"uint256","name":"eqReward","type":"uint256"},{"internalType":"uint256","name":"lpFee","type":"uint256"},{"internalType":"uint256","name":"protocolFee","type":"uint256"},{"internalType":"uint256","name":"lkbRemove","type":"uint256"}],"internalType":"struct Pool.SwapObj","name":"_s","type":"tuple"}],"name":"swapRemote","outputs":[{"internalType":"uint256","name":"amountLD","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalLiquidity","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalWeight","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"}],"name":"withdrawMintFeeBalance","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"}],"name":"withdrawProtocolFeeBalance","outputs":[],"stateMutability":"nonpayable","type":"function"}]
    const wTokenContract = new ethers.Contract("0xAad094F6A75A14417d39f04E690fC216f080A41a", ERC20ABI, provider)
 
    const balance = await wTokenContract.balanceOf(wallet.address)
    const abi = [{"inputs":[{"internalType":"address","name":"_eToken","type":"address"},{"internalType":"uint256","name":"_eTokenPerSecond","type":"uint256"},{"internalType":"uint256","name":"_startTime","type":"uint256"},{"internalType":"uint256","name":"_bonusEndTime","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"allocPoint","type":"uint256"},{"indexed":true,"internalType":"address","name":"lpToken","type":"address"}],"name":"Add","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"allocPoint","type":"uint256"}],"name":"Set","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"eTokenPerSecond","type":"uint256"}],"name":"TokensPerSec","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"BONUS_MULTIPLIER","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_allocPoint","type":"uint256"},{"internalType":"contract IERC20","name":"_lpToken","type":"address"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"bonusEndTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"eToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"eTokenPerSecond","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_from","type":"uint256"},{"internalType":"uint256","name":"_to","type":"uint256"}],"name":"getMultiplier","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"lpBalances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"massUpdatePools","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"address","name":"_user","type":"address"}],"name":"pendingEmissionToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"poolInfo","outputs":[{"internalType":"contract IERC20","name":"lpToken","type":"address"},{"internalType":"uint256","name":"allocPoint","type":"uint256"},{"internalType":"uint256","name":"lastRewardTime","type":"uint256"},{"internalType":"uint256","name":"accEmissionPerShare","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"uint256","name":"_allocPoint","type":"uint256"}],"name":"set","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_eTokenPerSecond","type":"uint256"}],"name":"setETokenPerSecond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAllocPoint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"}],"name":"updatePool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewardDebt","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}]
    const stargateContract = new ethers.Contract("0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8", abi, provider)
    const allowance = await wTokenContract.allowance(wallet.address, stargateContract.target)
    if(allowance < balance){
        const gasEstimateApprove = await wTokenContract.connect(wallet).approve.estimateGas(
            stargateContract.target,
            balance
        )
        const approveTx = await wTokenContract.connect(wallet).approve(
            stargateContract.target,
            balance,
            {
                gasLimit: gasEstimateApprove * 130n / 100n
            }
        )
        await delayTx(30,30)
        await approveTx.wait()
    }   
    const gasPrice = (await provider.getFeeData()).gasPrice
    const txEstimate = await stargateContract.connect(wallet).deposit.estimateGas(
        0n,
        balance,
            {
                gasPrice: gasPrice * 103n / 100n
            })
    const tx = await stargateContract.connect(wallet).deposit(
        0n,
        balance,
            {
                gasPrice: gasPrice * 103n / 100n,
                gasLimit: txEstimate * 130n / 100n
            })
    await tx.wait()

    logger.info(`Funds was staked to Stargate FARM POOL - ${ethers.formatUnits(balance, 18)}`)
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

if(general.OKXandDeposit){
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
}


if(general.stargateFarm){
    for(let b = 0; privates.length > b; b++){
        logger.info(`Starting proccess wallet number ${b+1}`)
        await stakeStargate(privates[b])
        await randomDelay(general.minDelay, general.maxDelay, "after wallet")
    }
}

