import React from 'react'
const paths = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  pet: <><ellipse cx="12" cy="16" rx="6" ry="5"/><circle cx="4" cy="9" r="2"/><circle cx="9" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="21" cy="9" r="2"/></>,
  user: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-5 3 1.5-6A8.5 8.5 0 1 1 21 11.5Z"/>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>,
  mute: <><path d="M9 9v3a3 3 0 0 0 5 2M9 5V4a3 3 0 0 1 6 0v6M5 10v2a7 7 0 0 0 12 5M19 10v2M12 19v3M8 22h8M2 2l20 20"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m9 3 1-2h4l1 2 3 2 2 .1 2 4-1 2v3l1 2-2 4-2 .1-3 2-1 2h-4l-1-2-3-2-2-.1-2-4 1-2v-3l-1-2 2-4L6 5Z" transform="translate(2 2) scale(.83)"/></>,
  dress: <><path d="M9 2h6l2 5-3 4 6 11H4l6-11-3-4Z"/><path d="M10 11h4"/></>,
  stop: <rect x="5" y="5" width="14" height="14" rx="3"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  sound: <><path d="m3 9 4 0 5-5v16l-5-5H3Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  memory: <><path d="M12 3v18M8 3a4 4 0 0 0-4 4 4 4 0 0 0-1 7 4 4 0 0 0 5 7l4-2 4 2a4 4 0 0 0 5-7 4 4 0 0 0-1-7 4 4 0 0 0-4-4Z"/></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
  search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
}
export default function Icon({ name, size = 20, ...rest }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{paths[name] || paths.heart}</svg>
}
