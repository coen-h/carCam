'use server';

import { PrismaClient }  from '../generated/prisma';

export default async function fetchSearch(query: string) {
  const prisma = new PrismaClient();

  try {
    const results = await prisma.list.findMany();
    return results;
  } catch (error) {
    console.error("Error fetching search results:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}