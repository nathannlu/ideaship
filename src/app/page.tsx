import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { listChatConversations } from '@/actions/chat-conversations';
import LandingPageClient from '@/components/Landing/LandingPageClient';

export const metadata: Metadata = {
  title: 'Ideaship',
  description: 'Easily test and iterate ideas as an indiehacker',
};

export default async function LandingPage() {
  // Server-side session and chat fetch
  const session = await getServerSession(authOptions);
  const sessions = session ? await listChatConversations() : [];
  return <LandingPageClient sessions={sessions} session={session} />;
}
