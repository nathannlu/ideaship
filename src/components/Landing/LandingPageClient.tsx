"use client"

import React from 'react';
import { Canvas } from '@/components/GradientCanvas';
import NavBar from '@/components/NavBar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LandingPrompt } from './LandingPrompt';
import BlogSection from "./BlogSection";

interface SessionData {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface ChatSessionEntry {
  id: string;
  title: string | null;
  createdAt: string;
  published: boolean;
  publishedAt: string | null;
}

interface LandingPageClientProps {
  sessions: ChatSessionEntry[];
  session: SessionData | null;
}

export default function LandingPageClient({ sessions, session }: LandingPageClientProps) {
  const { data: clientSession } = useSession();
  const router = useRouter();
  const loggedIn = clientSession?.user != null;


  return (
    <>
      <div className="flex flex-col relative w-screen overflow-hidden">
        {/* Navbar */}
        {/* Extracted to NavBar component */}
        <NavBar />
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-48 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 max-w-4xl">
            Launch your MVP quick.
          </h1>
          <p className="text-white/80 text-xl md:text-2xl max-w-3xl mb-12">
            Test your ideas, build your MVP, launch and get feedback from real users fast with a quick prompt.
          </p>
          <div className="w-full max-w-3xl mb-12">
            <LandingPrompt />
          </div>
          {/* Chat history list */}
          {loggedIn && sessions.length > 0 && (
            <div className="container mx-auto px-4 mb-12 max-w-3xl">
              <h2 className="text-2xl font-semibold text-white mb-4">Your Conversations</h2>
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => router.push(`/chat/${s.id}`)}
                      className="w-full text-left px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-white"
                    >
                      {s.title || 'Untitled Chat'}
                      <span className="block text-xs text-gray-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Gradient background canvas */}
        <Canvas />


      </div>
      <BlogSection />
    </>
  );
}
