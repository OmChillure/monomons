import { Elysia, t } from 'elysia';
import { BettingService } from '../services/betting.service';
import { AuthService } from '../services/auth.service';

export const betRoutes = new Elysia({ prefix: '/api/bets' })
    .derive(async ({ headers }) => {
        const authHeader = headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) return { user: null };
        const token = authHeader.split(' ')[1];
        const payload = AuthService.verifyToken(token);
        
        if (!payload) return { user: null };
        
        const user = await AuthService.getUserByAddress(payload.address);
        return { user };
    })
    .post('/', async ({ body, user, set }) => {
        if (!user) {
            set.status = 401;
            return { success: false, error: "Unauthorized" };
        }

        const { roomId, choice, amount, txHash } = body;
        
        try {
            await BettingService.placeBet(user.id, roomId, choice, amount, txHash);
            return { success: true, message: "Bet placed successfully" };
        } catch (e: any) {
            return { success: false, error: e.message };
        }

    }, {
        body: t.Object({
            roomId: t.String(),
            choice: t.Union([t.Literal('playerA'), t.Literal('playerB')]),
            amount: t.String(), // in Wei
            txHash: t.String()
        })
    })
    .get('/balance/:address', async ({ params }) => {
        try {
            const balance = await BettingService.getPoolBalance(params.address);
            return { success: true, balance };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    })
    .get('/total', async () => {
        try {
            const total = await BettingService.getTotalDeposits();
            return { success: true, total };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });
