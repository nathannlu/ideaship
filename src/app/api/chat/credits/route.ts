import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { FEATURE_FLAGS } from "@/constants";

/**
 * Get remaining chat credits for the authenticated user.
 * If ENABLE_DAILY_CREDIT_LIMIT is true, users are limited to DEFAULT_DAILY_CREDITS per UTC day.
 * Otherwise, return the total credits from the user's account.
 */
export async function GET(request: NextRequest) {
  // Authenticate via JWT token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Fetch user
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  
  // Check if daily credit limit is enabled
  if (FEATURE_FLAGS.ENABLE_DAILY_CREDIT_LIMIT) {
    // Determine UTC start of today
    const now = new Date();
    const startOfDayUtc = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0
    ));
    
    let spent = user.chatCreditsSpent ?? 0;
    if (!user.chatCreditsLastReset || new Date(user.chatCreditsLastReset) < startOfDayUtc) {
      // Reset for new day
      await prisma.user.update({
        where: { id: user.id },
        data: { chatCreditsSpent: 0, chatCreditsLastReset: now }
      });
      spent = 0;
    }
    
    const remaining = Math.max(FEATURE_FLAGS.DEFAULT_DAILY_CREDITS - spent, 0);
    return NextResponse.json({ credits: remaining });
  } else {
    // If daily limit is disabled, return the user's total credits
    return NextResponse.json({ credits: user.credits || 0 });
  }
}