import { db } from "../db";
import { players, users } from "../db/schema";
import { eq } from "drizzle-orm";

export interface PlayerPosition {
  x: number;
  y: number;
  direction: string;
}

export interface OnlinePlayer {
  id: string;
  userId: string;
  address: string;
  username: string | null;
  position: PlayerPosition;
  lastSeen: Date;
}

class PlayerStateManager {
  private onlinePlayers: Map<string, OnlinePlayer> = new Map();

  async getOrCreatePlayer(userId: string, address: string) {
    // Check if user exists in DB by address
    const [user] = await db.select().from(users).where(eq(users.address, address)).limit(1);
    
    if (!user) {
      throw new Error("User not found");
    }

    let [player] = await db
      .select()
      .from(players)
      .where(eq(players.userId, user.id))
      .limit(1);

    if (!player) {
      // Create new player
      [player] = await db
        .insert(players)
        .values({
          userId: user.id,
          username: address.slice(0, 10),
          positionX: 0,
          positionY: 0,
          direction: "down",
          isOnline: true,
          lastSeen: new Date(),
        })
        .returning();
    } else {
      // Update online status
      await db
        .update(players)
        .set({ isOnline: true, lastSeen: new Date() })
        .where(eq(players.id, player.id));
    }

    const onlinePlayer: OnlinePlayer = {
      id: player.id,
      userId: player.userId,
      address,
      username: player.username,
      position: {
        x: player.positionX,
        y: player.positionY,
        direction: player.direction,
      },
      lastSeen: player.lastSeen,
    };

    this.onlinePlayers.set(player.id, onlinePlayer);
    return onlinePlayer;
  }

  async updatePlayerPosition(playerId: string, position: PlayerPosition) {
    const player = this.onlinePlayers.get(playerId);
    if (!player) return;

    player.position = position;
    player.lastSeen = new Date();

    // Update in database
    await db
      .update(players)
      .set({
        positionX: position.x,
        positionY: position.y,
        direction: position.direction,
        lastSeen: new Date(),
      })
      .where(eq(players.id, playerId));
  }

  async removePlayer(playerId: string) {
    this.onlinePlayers.delete(playerId);

    // Update offline status in DB
    await db
      .update(players)
      .set({ isOnline: false, lastSeen: new Date() })
      .where(eq(players.id, playerId));
  }

  getOnlinePlayers(): OnlinePlayer[] {
    return Array.from(this.onlinePlayers.values());
  }

  getPlayer(playerId: string): OnlinePlayer | undefined {
    return this.onlinePlayers.get(playerId);
  }
}

export const playerStateManager = new PlayerStateManager();
