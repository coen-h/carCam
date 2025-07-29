'use server';

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export async function updatePlate(car) {
  try {
    const updatedCar = await prisma.list.update({
      where: {
        plate_number: car.plate_number,
      },
      data: {
        name: car.name,
        licence_class: car.licence_class,
        car_make: car.car_make,
        car_model: car.car_model,
        car_year: car.car_year,
        plate_number: car.plate_number,
      },
    });
    return updatedCar;
  } catch (error) {
    console.error('Error updating car:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}