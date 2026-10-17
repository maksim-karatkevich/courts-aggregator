import type { SessionUser } from '@/lib/auth-client'

export function UserAvatar({ user }: { user: SessionUser }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
  }
  return <>{(user.name || user.email).trim().slice(0, 2).toUpperCase()}</>
}
