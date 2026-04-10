import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_ADMINS = [
  "henrik.stahl@hammarbyfotboll.se",
  "david.jesperson.mora@hammarbyfotboll.se",
  "lukas.lundberg@hammarbyfotboll.se",
];

async function main() {
  console.log("Seeding initial admin users...");

  // Upsert the three whitelisted users as active admins
  for (const email of INITIAL_ADMINS) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: "Admin",
        status: "active",
      },
      create: {
        email,
        role: "Admin",
        status: "active",
      },
    });
    console.log(`✓ ${user.email} — role: ${user.role}, status: ${user.status}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
