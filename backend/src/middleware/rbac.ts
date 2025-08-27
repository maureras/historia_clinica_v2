import { Request, Response, NextFunction } from 'express'

export function requireRole(...roles: Array<'admin' | 'doctor' | 'nurse' | 'receptionist'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
