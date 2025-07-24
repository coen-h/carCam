'use server';

import { PrismaClient }  from '../generated/prisma';

export default async function fetchSearch(plate: string) {
  const prisma = new PrismaClient();

  try {
    const results = await prisma.list.findFirst({
      where: {
        plate_number: plate
      }
    });

    const events = await prisma.event.findMany({
      where: {
        plate_number: plate
      }
    })
    return { results, events };
  } catch (error) {
    console.error("Error fetching search results:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}