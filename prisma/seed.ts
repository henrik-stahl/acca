import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email) {
    console.error("Error: SEED_ADMIN_EMAIL environment variable is required.");
    console.error("Usage: SEED_ADMIN_EMAIL=you@example.com npm run db:seed");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists (${email}), skipping.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "Admin",
      status: "active",
    },
  });

  console.log(`Created admin user: ${user.email} (${user.name})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
