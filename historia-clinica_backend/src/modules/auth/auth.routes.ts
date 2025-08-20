import { Router } from 'express';
import { login, logout, me } from './auth.controller';
import { requireAuth } from './auth.middleware';

export const authRouter = Router();

// públicas
authRouter.post('/login', login);

// protegidas
authRouter.get('/verify', requireAuth, (req, res) => {
  res.json({ ok: true, auth: req.auth });
});
authRouter.get('/me', requireAuth, me);
authRouter.post('/logout', requireAuth, logout);

// re-export para usar en server
export { requireAuth } from './auth.middleware';
export { requireRoles } from './auth.middleware';
