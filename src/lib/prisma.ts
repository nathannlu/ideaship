import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// For debugging purposes - log all queries
const prismaClientSingleton = () => {
  // Log SQL queries in development
  if (process.env.NODE_ENV !== "production") {
    return new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  
  return new PrismaClient();
};

export const prisma = global.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Add a simple test function to verify Prisma is working
export async function testPrismaConnection() {
  try {
    // Test connection with a simple query
    await prisma.$connect();
    
    // Log available models
    console.log('Available Prisma models:', Object.keys(prisma));
    
    return { 
      success: true, 
      models: Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')) 
    };
  } catch (error) {
    console.error('Prisma connection test failed:', error);
    return { success: false, error: error.message };
  }
}