import { createPublicClient, createWalletClient, http, parseAbiItem, parseEther, formatEther, defineChain, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { db } from '../db';
import { bets, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Monad Testnet Configuration
const monadTestnet = defineChain({
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz/'] },
        public: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz/'] }
    },
    testnet: true
});

const CONTRACT_ADDRESS = "0x3B3aB1A308F352a43b1d10a2a0Fd4B81AF2C7413";
const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY as Hex;

const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http()
});

const walletClient = createWalletClient({
    chain: monadTestnet,
    transport: http(),
    account: ADMIN_KEY ? privateKeyToAccount(ADMIN_KEY) : undefined
});

const CONTRACT_ABI = [
    parseAbiItem("function getPoolBalance(address pool) external view returns (uint256)"),
    parseAbiItem("function getTotalDeposits() external view returns (uint256)"),
    parseAbiItem("function withdraw(address pool, uint256 amount, address payable recipient) external")
];

export class BettingService {
    
    static async placeBet(userId: string, roomId: string, choice: 'playerA' | 'playerB', amount: string, txHash: string) {
        if (!process.env.DATABASE_URL) {
           console.warn("DB Validation skipped for betting (No DB setup)");
           return { success: true, mock: true };
        }

        // 1. Verify transaction on-chain
        try {
            console.log(`Verifying bet tx: ${txHash}`);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });
            
            if (receipt.status !== 'success') {
                throw new Error("Transaction failed on-chain");
            }

            // Verify it went to our contract
            if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
                throw new Error(`Transaction recipient mismatch. Expected ${CONTRACT_ADDRESS}, got ${receipt.to}`);
            }

            // 2. Store in DB
            // First check if user exists (mock or real)
            let user = await db.query.users.findFirst({ where: eq(users.id, userId) });
            
            // If strictly enforcing, fail. For hackathon, maybe logging relevant info.
            if (!user) {
                 // Try to look up by sender address from receipt?
                 // For now, assume auth userId is valid or we just skip foreign key constraint by trusting input if we were raw...
                 // But we have constraints.
                 console.warn(`User ${userId} not found for bet.`);
                 throw new Error("User not found");
            }

            // Check if tx already used
            const existing = await db.query.bets.findFirst({ where: eq(bets.txHash, txHash) });
            if (existing) {
                console.warn("Duplicate bet attempt");
                return { success: true, duplicate: true };
            }

            await db.insert(bets).values({
                userId,
                userAddress: user.address,
                roomId,
                choice,
                amount,
                txHash,
                status: 'pending'
            });

            console.log(`Bet placed: ${amount} MON on ${choice} by ${user.address}`);
            return { success: true };

        } catch (e) {
            console.error("Bet Verification Error:", e);
            throw e;
        }
    }

    static async distributeWinnings(roomId: string, winner: 'playerA' | 'playerB') {
        if (!process.env.DATABASE_URL || !ADMIN_KEY) {
            console.log("Skipping payout (No DB or Admin Key)");
            return;
        }

        console.log(`Calculating Payouts for Room ${roomId}...`);
        
        const roomBets = await db.query.bets.findMany({
            where: and(eq(bets.roomId, roomId), eq(bets.status, 'pending'))
        });

        if (roomBets.length === 0) {
            console.log("No pending bets.");
            return;
        }

        const winners = roomBets.filter(b => b.choice === winner);
        const losers = roomBets.filter(b => b.choice !== winner);

        const totalPool = roomBets.reduce((acc, b) => acc + BigInt(b.amount), 0n);
        const loserPool = losers.reduce((acc, b) => acc + BigInt(b.amount), 0n);
        const winnerPool = winners.reduce((acc, b) => acc + BigInt(b.amount), 0n);

        console.log(`Winner: ${winner} | Pool: ${formatEther(totalPool)} MON`);
        
        // Payout Queue from Losers
        let fundSources = losers.map(l => ({ user: l.userAddress, amount: BigInt(l.amount) }));

        // Process Winners
        for (const w of winners) {
            const principal = BigInt(w.amount);
            // Profit share = (MyBet / TotalWinnerBets) * TotalLoserBets
            const shareOfProfit = winnerPool > 0n ? (principal * loserPool) / winnerPool : 0n;
            
            console.log(`Processing Winner ${w.userAddress}: Principal ${formatEther(principal)} + Profit ${formatEther(shareOfProfit)}`);

            try {
                // 1. Return Principal (From their own pool)
                await this.withdrawFromContract(w.userAddress, principal, w.userAddress);
                
                // 2. Pay Profit (From losers)
                let remainingProfitNeeded = shareOfProfit;
                
                while (remainingProfitNeeded > 0n && fundSources.length > 0) {
                    const source = fundSources[0];
                    // We can take up to source.amount
                    const amountToTake = source.amount > remainingProfitNeeded ? remainingProfitNeeded : source.amount;
                    
                    if (amountToTake > 0n) {
                        await this.withdrawFromContract(source.user, amountToTake, w.userAddress);
                        source.amount -= amountToTake;
                        remainingProfitNeeded -= amountToTake;
                    }
                    
                    if (source.amount === 0n) {
                        fundSources.shift();
                    }
                }

                await db.update(bets).set({ status: 'won' }).where(eq(bets.id, w.id));

            } catch (e) {
                console.error(`Failed to payout winner ${w.userAddress}`, e);
            }
        }

        // Mark losers
        for (const l of losers) {
            await db.update(bets).set({ status: 'lost' }).where(eq(bets.id, l.id));
        }
        
        console.log("Payouts complete.");
    }

    static async getPoolBalance(address: string): Promise<string> {
        try {
            const balance = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'getPoolBalance',
                args: [address as Hex]
            }) as bigint;
            
            return formatEther(balance);
        } catch (e) {
            console.error("Failed to fetch pool balance:", e);
            throw e;
        }
    }

    static async getTotalDeposits(): Promise<string> {
        try {
            const total = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'getTotalDeposits'
            }) as bigint;
            
            return formatEther(total);
        } catch (e) {
            console.error("Failed to fetch total deposits:", e);
            throw e;
        }
    }

    private static async withdrawFromContract(pool: string, amount: bigint, recipient: string) {
        if (!walletClient.account) throw new Error("Admin wallet not configured");
        
        console.log(`Contract Withdraw: Pool ${pool} -> ${formatEther(amount)} -> ${recipient}`);
        
        const { request } = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'withdraw',
            args: [pool as Hex, amount, recipient as Hex],
            account: walletClient.account
        });
        
        const hash = await walletClient.writeContract(request);
        console.log(` -> Tx: ${hash}`);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
}
