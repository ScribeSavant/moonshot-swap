import BN from "bn.js"
import bs58 from "bs58"

import { IDL, type MoonShotIDL } from "./idl";

import {
    AnchorProvider, Program, Wallet
} from "@coral-xyz/anchor";

import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
    type Commitment
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";


type CurveState = {
    totalSupply: BN
    curveAmount: BN
    mint: PublicKey
    quoteMint: PublicKey
    key: PublicKey
    decimals: number
    collateralCurrency: "sol",
    curveType: "constantProductV1" | "linearV1"
    marketcapThreshold: BN
    marketcapCurrency: "sol"
    migrationFee: BN
    coefB: number
    bump: number
    migrationTarget: "meteora" | "raydium"
    curvePosition: BN
    configAccount: PublicKey
}

export default class MoonShot {
    private provider: AnchorProvider
    private wallet: Wallet
    private program: Program<MoonShotIDL>

    // Curve Calculation
    private initialVirtualTokenReserves = new BN("1073000000000000000")
    private initialVirtualCollateralReserves = new BN("30000000000");
    private constantProduct: BN
    private helioFee = new PublicKey("5K5RtTWzzLp4P8Npi84ocf7F1vBsAu29N1irG4iiUnzt")
    private dexFee = new PublicKey("3udvfL24waJcLhskRAsStNMoNUvtyXdxrWQz4hgi953N")
    private sol = new PublicKey("So11111111111111111111111111111111111111112")



    constructor(rpcUrl: string, privateKey: string, commitment: Commitment) {
        let connection = new Connection(rpcUrl)
        this.wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(privateKey)))
        this.provider = new AnchorProvider(connection, this.wallet, { commitment: commitment })
        this.program = new Program(IDL, "MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG", this.provider)
        this.constantProduct = this.initialVirtualTokenReserves.mul(this.initialVirtualCollateralReserves);
    }


    async swap(curveState: CurveState, inAmount: BN, input: "sol" | "token", slippage: number, execute: boolean = false) {
        let amountOut = this.calculateAmountOut(curveState, inAmount, input)

        let instructions: TransactionInstruction[] = [
            ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0.00005 * LAMPORTS_PER_SOL })
        ]

        let senderTokenAccount = getAssociatedTokenAddressSync(curveState.mint, this.wallet.publicKey, true)
        let curveTokenAccount = getAssociatedTokenAddressSync(curveState.mint, curveState.key, true)

        const data = {
            tokenAmount: input == "sol" ? amountOut : inAmount,
            collateralAmount: input == "sol" ? inAmount : amountOut,
            fixedSide: "in",
            slippageBps: new BN(slippage * 100),
        };

        let swapInstruction = await this.program.methods[input == "sol" ? "buy" : "sell"](data as any)
            .accounts({
                sender: this.wallet.publicKey,
                senderTokenAccount,
                curveAccount: curveState.key,
                curveTokenAccount,
                mint: curveState.mint,
                configAccount: curveState.configAccount,
                dexFee: this.dexFee,
                helioFee: this.helioFee,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        instructions.push(swapInstruction)

        let transaction = new VersionedTransaction(new TransactionMessage({
            recentBlockhash: (await this.provider.connection.getLatestBlockhash()).blockhash,
            instructions,
            payerKey: this.wallet.publicKey
        }).compileToV0Message())

        transaction.sign([this.wallet.payer])

        return execute ? await this.provider.connection.sendTransaction(transaction) : await this.provider.connection.simulateTransaction(transaction)
    }
    async getCurveState(mint: PublicKey) {
        let [key, _] = PublicKey.findProgramAddressSync([Buffer.from("token"), mint.toBytes()], this.program.programId)
        const [configAccount] = PublicKey.findProgramAddressSync([Buffer.from('config_account')], this.program.programId);
        let account = await this.program.account.curveAccount.fetch(key)
        if (!account) throw new Error("Accouunt not found");
        let curveState = {} as CurveState
        curveState.key = key
        curveState.quoteMint = this.sol
        Object.assign(curveState, account)
        curveState.curvePosition = curveState.totalSupply.sub(curveState.curveAmount)
        curveState.collateralCurrency = "sol"
        curveState.curveType = Object.keys(account.curveType)[0].toLowerCase() as any
        curveState.marketcapCurrency = "sol"
        curveState.migrationTarget = Object.keys(account.migrationTarget)[0].toLowerCase() as any
        curveState.configAccount = configAccount
        return curveState
    }

    calculateAmountOut(curveState: CurveState, amount: BN, input: "token" | "sol"): BN {
        let [reserveA, reserveB] = this.getReserves(curveState.curvePosition);

        if (input == "sol") [reserveA, reserveB] = [reserveB, reserveA];

        const denominator = reserveA.add(amount);
        const numerator = this.constantProduct.div(denominator);
        return reserveB.sub(numerator);
    }

    private getReserves(curvePosition: BN) {
        const virtualTokenReserves = this.initialVirtualTokenReserves.sub(curvePosition);
        const virtualSolReserves = this.constantProduct.div(virtualTokenReserves);
        return [
            virtualTokenReserves,
            virtualSolReserves
        ];
    }


}