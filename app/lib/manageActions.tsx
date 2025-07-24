'use server';

import { PrismaClient } from '../generated/prisma';
import Papa from 'papaparse';

const prisma = new PrismaClient();

export async function addPlate(car) {
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

export async function removePlate(plate) {
  try {
    const deletedCars = await prisma.list.deleteMany({
      where: {
        plate_number: plate,
      },
    });
    
    if (deletedCars.count === 0) {
      throw new Error(`No plate found with number: ${plate}`);
    }
    
    return deletedCars;
  } catch (error) {
    console.error('Error removing plate:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getAllPlates() {
  try {
    const newCar = await prisma.list.findMany();
    return newCar;
  } catch (error) {
    console.error('Error adding car:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}


export async function uploadPlatesCsv(csvFile) {
  try {
    const fileContent = await csvFile.text();

    const parsedData = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) =>
        header.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    });

    if (parsedData.errors.length > 0) {
      console.error('CSV Parsing Errors:', parsedData.errors);
      throw new Error('Failed to parse CSV file.');
    }

    const platesToCreate = parsedData.data.map((row) => ({
      name: row.name,
      licence_class: row.licence_class,
      car_make: row.car_make,
      car_model: row.car_model,
      car_year: row.car_year,
      plate_number: row.plate_number,
    }));

    const newCars = await prisma.list.createMany({
      data: platesToCreate,
      skipDuplicates: true,
    });
    return newCars;
  } catch (error) {
    console.error('Error uploading CSV file:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}