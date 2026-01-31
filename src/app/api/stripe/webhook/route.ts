import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Stripe } from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2019-05-16", // Use the latest API version
});

export async function POST(request: NextRequest) {
  try {
    // Get the raw body and signature header
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing Stripe webhook secret");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Verify the event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get the customer email from the session
      const customerEmail = session.customer_details?.email;
      if (!customerEmail) {
        console.error("No customer email found in session");
        return NextResponse.json({ error: "Customer email not found" }, { status: 400 });
      }

      // Find the user by email
      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
      });

      if (!user) {
        console.error(`User not found for email: ${customerEmail}`);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get line items to determine which product was purchased
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      
      // Default to 10 credits if we can't match the price
      let creditsToAdd = 10;
      
      // Update the user's credits
      await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: (user.credits || 0) + creditsToAdd,
        },
      });

      console.log(`Added ${creditsToAdd} credits to user ${user.id} (${user.email})`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
