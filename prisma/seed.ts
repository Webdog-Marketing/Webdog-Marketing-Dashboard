import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.staffMember.upsert({
    where: { id: "matt" },
    update: {},
    create: { id: "matt", name: "Matt", availableHours: 55 },
  });

  await prisma.staffMember.upsert({
    where: { id: "jatin" },
    update: {},
    create: { id: "jatin", name: "Jatin", availableHours: 20, hourlyCost: 20 },
  });

  const owens = await prisma.client.upsert({
    where: { id: "owens" },
    update: {},
    create: {
      id: "owens",
      name: "Owens Exterior Cleaning",
      status: "ACTIVE",
      monthlyHours: 3,
      rate: 50,
      startDate: new Date(),
    },
  });

  await prisma.incomeEntry.upsert({
    where: { id: "owens-seed-income" },
    update: {},
    create: {
      id: "owens-seed-income",
      clientId: owens.id,
      label: "Monthly SEO retainer",
      type: "SEO_RETAINER",
      amount: 150,
      date: new Date(),
      recurring: true,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
