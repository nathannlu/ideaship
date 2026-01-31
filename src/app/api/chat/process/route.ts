import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { FEATURE_FLAGS } from "@/constants";

/**
 * An internal endpoint that processes a chat message:
 * 1. Validates that the user has enough credits
 * 2. Deducts credits as appropriate
 * 3. Returns success if the message can be processed
 * 
 * This is called before sending a message to the generate-code endpoint
 */
export async function POST(request: NextRequest) {
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
  
  try {
    // Check if daily credit limit is enabled
    if (FEATURE_FLAGS.ENABLE_DAILY_CREDIT_LIMIT) {
      // Reset or enforce daily allowance (limit to DEFAULT_DAILY_CREDITS messages per UTC day)
      const now = new Date();
      const startOfDayUtc = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0
      ));
      
      if (!user.chatCreditsLastReset || new Date(user.chatCreditsLastReset) < startOfDayUtc) {
        // New UTC day: reset spent to 1 for this message
        await prisma.user.update({
          where: { id: user.id },
          data: { chatCreditsSpent: 1, chatCreditsLastReset: now }
        });
      } else {
        if (user.chatCreditsSpent >= FEATURE_FLAGS.DEFAULT_DAILY_CREDITS) {
          return NextResponse.json({
            success: false,
            error: `Daily chat limit reached. You can only send ${FEATURE_FLAGS.DEFAULT_DAILY_CREDITS} messages per day.`
          }, { status: 403 });
        }
        
        // Increment spent count
        await prisma.user.update({
          where: { id: user.id },
          data: { chatCreditsSpent: { increment: 1 } }
        });
      }
    } else {
      // Use the purchased credits system instead of daily limits
      if (!user.credits || user.credits <= 0) {
        return NextResponse.json({
          success: false,
          error: 'You have no credits remaining. Please purchase more credits to continue.'
        }, { status: 403 });
      }
      
      // Decrement the user's credits by 1
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } }
      });
    }
    
    // If we reach here, credits were successfully checked and deducted
    return NextResponse.json({ 
      success: true,
      message: "Credits processed successfully",
      userId: user.id
    });
  } catch (error) {
    console.error("Error processing credits:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to process credits" 
    }, { status: 500 });
  }
}
