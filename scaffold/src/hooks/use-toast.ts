// lib/use-toast.tsx
import * as React from "react"
import { toast as sonnerToast } from "sonner"

/** -------------------------------------------------
 *  Types — keep them identical to what the rest
 *  of your code already expects.
 *  ------------------------------------------------- */
export type ToastActionElement = React.ReactElement

export interface Toast {
  title: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  /* any extra Sonner options you want */
  duration?: number
  important?: boolean
}

/** -------------------------------------------------
 *  toast() — thin wrapper around sonner
 *  ------------------------------------------------- */
export function toast(props: Toast) {
  const { title, ...options } = props
  const id = sonnerToast(title, options)           // Sonner gives back an id

  const dismiss = () => sonnerToast.dismiss(id)

  const update = (next: Partial<Toast>) =>
    sonnerToast(next.title ?? title, {
      id,                    // ← pass id to update
      ...options,
      ...next,
    })

  // preserve the old return shape
  return { id: id.toString(), dismiss, update }
}

/** -------------------------------------------------
 *  useToast() — no local state necessary anymore
 *  ------------------------------------------------- */
export function useToast() {
  return {
    toasts: [],                                 // keeps the old interface intact
    toast,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  }
}
