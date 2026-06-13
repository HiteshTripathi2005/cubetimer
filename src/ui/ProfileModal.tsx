import { useRef, useState } from 'react'
import type { Profile } from '../types'
import { Modal } from './Modal'
import { Avatar } from './Avatar'

interface Props {
  profile: Profile
  onSave: (profile: Profile) => void
  onClose: () => void
}

// Read an image file, crop to a centered square, and downscale to 128px so the
// avatar stays tiny in localStorage. Falls back to the raw data URL on failure.
async function fileToAvatar(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('decode failed'))
      img.src = dataUrl
    })
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    const min = Math.min(img.width, img.height)
    ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return dataUrl
  }
}

export function ProfileModal({ profile, onSave, onClose }: Props) {
  const [name, setName] = useState(profile.name)
  const [info, setInfo] = useState(profile.info)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatar(await fileToAvatar(file))
  }

  const save = () => {
    onSave({ name: name.trim(), avatar, info: info.trim() })
    onClose()
  }

  const field = 'mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500'
  const ghost = 'rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs'

  return (
    <Modal title="Profile" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar profile={{ name, avatar, info }} size={56} />
          <div className="flex gap-2">
            <button type="button" className={ghost} onClick={() => fileRef.current?.click()}>
              {avatar ? 'Change' : 'Upload'} photo
            </button>
            {avatar && (
              <button type="button" className={`${ghost} text-red-500`} onClick={() => setAvatar(null)}>
                Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              aria-label="Avatar image" onChange={(e) => void pick(e)} />
          </div>
        </div>

        <label className="text-xs text-zinc-500">Name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your name" aria-label="Profile name" />
        </label>

        <label className="text-xs text-zinc-500">About
          <textarea className={`${field} resize-none`} rows={3} value={info}
            onChange={(e) => setInfo(e.target.value)} placeholder="Main cube, goals, anything…"
            aria-label="Profile info" />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500" onClick={save}>Save</button>
        </div>
      </div>
    </Modal>
  )
}
