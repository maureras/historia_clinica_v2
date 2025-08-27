import React, { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores'

function formatNow() {
  const d = new Date()
  const fecha = d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('es-EC', { hour12: false })
  return `${fecha} ${hora}`
}

export default function Watermark() {
  const { user } = useAuthStore() as any
  const [now, setNow] = useState(formatNow())

  useEffect(() => {
    const id = setInterval(() => setNow(formatNow()), 1000)
    return () => clearInterval(id)
  }, [])

  const label = useMemo(() => {
    const first =
      user?.firstName ||
      user?.given_name ||
      (user?.name ? String(user.name).split(' ')[0] : '') ||
      user?.profile?.firstName ||
      user?.user?.firstName ||
      user?.data?.firstName ||
      '';

    const last =
      user?.lastName ||
      user?.family_name ||
      (user?.name ? String(user.name).split(' ').slice(1).join(' ') : '') ||
      user?.profile?.lastName ||
      user?.user?.lastName ||
      user?.data?.lastName ||
      '';

    const displayName =
      `${first} ${last}`.trim() ||
      user?.fullName ||
      user?.profile?.name ||
      user?.user?.name ||
      user?.data?.name ||
      user?.name ||
      '';

    const email =
      user?.email ||
      user?.username ||
      user?.profile?.email ||
      user?.user?.email ||
      user?.data?.email ||
      '';

    let who = displayName || email || '';
    if (!who && typeof window !== 'undefined') {
      try {
        const rawAuth = localStorage.getItem('auth') || localStorage.getItem('user') || localStorage.getItem('auth_user');
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth);
          const pFirst =
            parsed?.firstName ||
            parsed?.given_name ||
            (parsed?.name ? String(parsed.name).split(' ')[0] : '') ||
            parsed?.profile?.firstName ||
            '';
          const pLast =
            parsed?.lastName ||
            parsed?.family_name ||
            (parsed?.name ? String(parsed.name).split(' ').slice(1).join(' ') : '') ||
            parsed?.profile?.lastName ||
            '';
          const pDisplay =
            `${pFirst} ${pLast}`.trim() ||
            parsed?.fullName ||
            parsed?.profile?.name ||
            parsed?.name ||
            '';
          const pEmail = parsed?.email || parsed?.username || parsed?.profile?.email || '';
          who = pDisplay || pEmail || '';
        }
      } catch {
        // noop
      }
    }

    const safeWho = who || 'Usuario';

    if (typeof window !== 'undefined' && (process.env.NODE_ENV !== 'production')) {
//      console.debug('[Watermark] user snapshot →', user);
    }

    return `${safeWho} — ${now}`;
  }, [user, now]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 select-none opacity-10 overflow-hidden"
      style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent 0 120px, rgba(0,0,0,0.04) 120px 121px)`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-24">
        <div className="-rotate-30 text-slate-700 space-y-24">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className={`flex gap-28 ${row % 2 === 0 ? 'translate-x-24' : '-translate-x-24'}`}>
              {Array.from({ length: 4 }).map((__, col) => (
                <div
                  key={`${row}-${col}`}
                  className="text-xl md:text-3xl font-semibold whitespace-nowrap leading-relaxed md:leading-loose tracking-wider px-8"
                >
                  {label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}