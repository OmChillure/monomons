import jwt from "jsonwebtoken";
import { verifyMessage } from "viem";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRY = "7d";
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export class AuthService {
  /**
   * Generate a random nonce for wallet authentication
   */
  static async generateNonce(address: string): Promise<string> {
    const nonce = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    const normalizedAddress = address.toLowerCase();

    // Upsert user with new nonce
    await db
      .insert(users)
      .values({
        address: normalizedAddress,
        nonce,
        nonceTimestamp: new Date(),
      })
      .onConflictDoUpdate({
        target: users.address,
        set: {
          nonce,
          nonceTimestamp: new Date(),
          updatedAt: new Date(),
        },
      });

    return nonce;
  }

  /**
   * Verify the wallet signature
   */
  static async verifySignature(
    address: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const normalizedAddress = address.toLowerCase();
      
      // Get user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.address, normalizedAddress))
        .limit(1);

      if (!user || !user.nonce || !user.nonceTimestamp) {
        throw new Error("Nonce not found");
      }

      // Check if nonce is expired
      const now = Date.now();
      const nonceTime = user.nonceTimestamp.getTime();
      if (now - nonceTime > NONCE_EXPIRY) {
        // Clear expired nonce
        await db
          .update(users)
          .set({ nonce: null, nonceTimestamp: null })
          .where(eq(users.address, normalizedAddress));
        throw new Error("Nonce expired");
      }

      // Verify the message contains the nonce
      if (!message.includes(user.nonce)) {
        throw new Error("Invalid nonce in message");
      }

      // Verify the signature
      const isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (isValid) {
        // Clear used nonce and update last login
        await db
          .update(users)
          .set({
            nonce: null,
            nonceTimestamp: null,
            lastLogin: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.address, normalizedAddress));
        return true;
      }

      return false;
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(address: string): string {
    const payload = {
      address: address.toLowerCase(),
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): { address: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        address: string;
        iat: number;
      };
      return { address: decoded.address };
    } catch (error) {
      console.error("Token verification error:", error);
      return null;
    }
  }

  /**
   * Get user by address
   */
  static async getUserByAddress(address: string) {
    const normalizedAddress = address.toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.address, normalizedAddress))
      .limit(1);
    return user;
  }
}
