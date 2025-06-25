import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

export default function Home() {
  return (
    <div>
      <p>test</p>
    </div>
  );
}
