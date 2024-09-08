import BN from "bn.js";
import MoonShot from "./src/moonshot";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

let moonshot = new MoonShot(Bun.env.RPC_URL!, Bun.env.PRIVATE_KEY!, "confirmed")

let curveState = await moonshot.getCurveState(new PublicKey("DkHjFkUXuxkw94W9cfs4FUkfmD5fvHfAAiQPKoK1APZR")) // Token Mint

async function buy() {
    let amount = new BN(0.1 * LAMPORTS_PER_SOL) // 0.1 SOL for buy
    let input: "sol" | "token" = "sol"
    let execute = false // if set true transaction will executed otherwise only logs will show in terminal
    let slippage = 15 // Default from dexscreener ui

    let signatureOrLogs = await moonshot.swap(curveState, amount, input, slippage, execute)
    console.log(signatureOrLogs)
}

async function sell() {
    let amount = new BN(1000 * 10 ** curveState.decimals) // 1000 TOKEN for sell
    let input: "sol" | "token" = "token"
    let execute = false // if set true transaction will executed otherwise only logs will show in terminal
    let slippage = 15 // Default from dexscreener ui

    let signatureOrLogs = await moonshot.swap(curveState, amount, input, slippage, execute)
    console.log(signatureOrLogs)
}


await buy()
await sell()