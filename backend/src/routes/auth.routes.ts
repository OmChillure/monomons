import { Elysia, t } from "elysia";
import { AuthService } from "../services/auth.service";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  // Get nonce for wallet authentication
  .post(
    "/nonce",
    async ({ body }) => {
      const { address } = body;

      if (!address) {
        return {
          success: false,
          error: "Address is required",
        };
      }

      const nonce = await AuthService.generateNonce(address);

      return {
        success: true,
        nonce,
      };
    },
    {
      body: t.Object({
        address: t.String(),
      }),
    }
  )

  // Verify signature and return JWT
  .post(
    "/verify",
    async ({ body, set }) => {
      const { address, signature, message } = body;

      if (!address || !signature || !message) {
        set.status = 400;
        return {
          success: false,
          error: "Address, signature, and message are required",
        };
      }

      const isValid = await AuthService.verifySignature(
        address,
        message,
        signature
      );

      if (!isValid) {
        set.status = 401;
        return {
          success: false,
          error: "Invalid signature",
        };
      }

      const token = AuthService.generateToken(address);

      return {
        success: true,
        token,
        address: address.toLowerCase(),
      };
    },
    {
      body: t.Object({
        address: t.String(),
        signature: t.String(),
        message: t.String(),
      }),
    }
  )

  // Verify JWT token (protected route example)
  .get(
    "/me",
    async ({ headers, set }) => {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return {
          success: false,
          error: "No token provided",
        };
      }

      const token = authHeader.split(" ")[1];
      const userData = AuthService.verifyToken(token);

      if (!userData) {
        set.status = 401;
        return {
          success: false,
          error: "Invalid token",
        };
      }

      return {
        success: true,
        address: userData.address,
      };
    }
  );
