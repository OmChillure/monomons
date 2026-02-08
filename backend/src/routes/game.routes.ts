import { Elysia } from "elysia";
import { AuthService } from "../services/auth.service";
import { playerStateManager, type PlayerPosition } from "../services/player.service";

interface WebSocketData {
  playerId?: string;
  userId?: string;
  address?: string;
}



export const gameRoutes = new Elysia()
  .ws("/ws/game", {
    async open(ws) {
      console.log("WebSocket connection opened");
      // Initialize our custom fields
      Object.assign(ws.data as any, { playerId: undefined, userId: undefined, address: undefined });
    },

    async message(ws, rawMessage) {
      try {
        const message = typeof rawMessage === 'string'
          ? JSON.parse(rawMessage)
          : rawMessage;

        // Use ws.data directly
        // Cast to any to avoid type issues if not strictly typed
        const wsData = (ws.data as any);

        switch (message.type) {
          case "auth": {
            const { token } = message;
            const userData = AuthService.verifyToken(token);

            if (!userData) {
              console.log("Token verification failed for token:", token);
              ws.send(
                JSON.stringify({
                  type: "error",
                  error: "Invalid token",
                })
              );
              ws.close();
              return;
            }

            console.log("Token verified for user:", userData.address);

            const player = await playerStateManager.getOrCreatePlayer(
              userData.address,
              userData.address
            );

            // Store in ws.data
            wsData.playerId = player.id;
            wsData.userId = player.userId;
            wsData.address = player.address;

            ws.send(
              JSON.stringify({
                type: "auth_success",
                player: {
                  id: player.id,
                  address: player.address,
                  username: player.username,
                  position: player.position,
                },
                onlinePlayers: playerStateManager.getOnlinePlayers(),
              })
            );

            // Broadcast new player joined to all others
            ws.publish(
              "game",
              JSON.stringify({
                type: "player_joined",
                player: {
                  id: player.id,
                  address: player.address,
                  username: player.username,
                  position: player.position,
                },
              })
            );

            ws.subscribe("game");
            break;
          }

          case "move": {
            const { playerId } = wsData;

            if (!playerId) {
              console.log("Move received but no playerId found in ws.data for this connection.");
              ws.send(
                JSON.stringify({
                  type: "error",
                  error: "Not authenticated",
                })
              );
              return;
            }

            const position: PlayerPosition = message.position;
            await playerStateManager.updatePlayerPosition(playerId, position);

            ws.publish(
              "game",
              JSON.stringify({
                type: "player_moved",
                playerId,
                position,
              })
            );
            break;
          }

          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            error: "Failed to process message",
          })
        );
      }
    },

    async close(ws) {
      const wsData = (ws.data as any);
      if (wsData?.playerId) {
        await playerStateManager.removePlayer(wsData.playerId);

        // Broadcast player left
        ws.publish(
          "game",
          JSON.stringify({
            type: "player_left",
            playerId: wsData.playerId,
          })
        );
      }
      console.log("WebSocket connection closed");
    },
  });
