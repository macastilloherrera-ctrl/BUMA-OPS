// Augmenta Express.User con la forma real del session user que produce
// devAuth, /api/auth/login y replitAuth. Sin esto, req.user queda como {}
// y todos los `req.user!.id`, `(req.user as any).id`, etc. lanzan TS2339.

import "express";

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      // Compat con el flujo OIDC de Replit (claims viene del token)
      claims?: {
        sub?: string;
        email?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        profile_image_url?: string | null;
        exp?: number;
      };
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}

export {};
