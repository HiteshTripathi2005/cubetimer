import type { Profile } from '../types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

// Round avatar: the uploaded image if set, else the name's initials, else a
// neutral glyph. Used in the header button and the profile editor.
export function Avatar({ profile, size = 32 }: { profile: Profile; size?: number }) {
  const dim = { width: size, height: size }
  if (profile.avatar) {
    return <img src={profile.avatar} alt="" className="rounded-full object-cover" style={dim} />
  }
  const text = initials(profile.name)
  return (
    <span
      className="grid place-items-center rounded-full bg-indigo-600 font-semibold text-white"
      style={{ ...dim, fontSize: size * 0.4 }}
    >
      {text || '🙂'}
    </span>
  )
}
