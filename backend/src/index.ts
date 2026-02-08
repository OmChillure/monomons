import { Elysia } from 'elysia'
import { staticPlugin } from '@elysiajs/static'
import { openapi, fromTypes } from '@elysiajs/openapi'
import { cors } from '@elysiajs/cors'
import { authRoutes } from './routes/auth.routes'
import { gameRoutes } from './routes/game.routes'

export const app = new Elysia()
	.use(cors({
		origin: true,
		credentials: true,
	}))
	.use(
		openapi({
			references: fromTypes()
		})
	)
	.use(authRoutes)
	.use(gameRoutes)
	.use(
		await staticPlugin({
			prefix: '/'
		})
	)
	.get('/message', { message: 'Hello from server' } as const)
	.listen(8080)

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
