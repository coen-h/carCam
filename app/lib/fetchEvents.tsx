'use server';

import { PrismaClient }  from '../generated/prisma';

export default async function fetchSearch() {
  const prisma = new PrismaClient();

  try {
    const results = await prisma.event.findMany();
    return results;
  } catch (error) {
    console.error("Error fetching search results:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}