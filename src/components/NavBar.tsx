"use client"
import React from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'

export default function NavBar() {
  const { data: session } = useSession()
  const loggedIn = !!session?.user
  const handleSignIn = () => signIn(undefined, { callbackUrl: '/' })

  return (
    <nav className="absolute top-0 left-0 w-full z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center text-white text-lg font-semibold">
          <Logo />
          <div className="ml-2">Ideaship</div>
        </Link>

        <div className="flex gap-4 items-center">
          <Link href="/blog" className="text-white">
            Blog
          </Link>
          <Link href="https://discord.gg/qmXWpEmQRU" target="_blank" className="text-white">
            Support
          </Link>
          {loggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    {session.user.image ? (
                      <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                    ) : (
                      <AvatarFallback>
                        {(() => {
                          const name = session.user.name || session.user.email || ''
                          const parts = name.trim().split(/\s+/)
                          if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
                          return name.substring(0, 2).toUpperCase()
                        })()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/' })}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleSignIn}>Sign In</Button>
          )}
        </div>
      </div>
    </nav>
  )
}
