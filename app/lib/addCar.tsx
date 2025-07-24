'use server';

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export async function addCar(car) {
  try {
    const newCar = await prisma.list.create({
      data: {
        name: car.name,
        licence_class: car.licence_class,
        car_make: car.car_make,
        car_model: car.car_model,
        car_year: car.car_year,
        plate_number: car.plate_number,
      },
    });
    return newCar;
  } catch (error) {
    console.error('Error adding car:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}