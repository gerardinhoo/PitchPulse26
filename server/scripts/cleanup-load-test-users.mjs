import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const shouldDelete = process.argv.includes("--yes");

async function main() {
  const { prisma } = await import("../lib/prisma.js");
  const users = await prisma.user.findMany({
    where: {
      displayName: {
        startsWith: "LoadTester-",
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (users.length === 0) {
    console.log("No LoadTester users found.");
    return;
  }

  const userIds = users.map((user) => user.id);
  const predictionCount = await prisma.prediction.count({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  console.log(
    `Found ${users.length} LoadTester users and ${predictionCount} related predictions.`,
  );
  console.log(`Database target: ${process.env.DATABASE_URL ? "configured" : "missing"}`);
  console.log("Sample users:");
  for (const user of users.slice(0, 5)) {
    console.log(`- #${user.id} ${user.displayName} <${user.email}>`);
  }

  if (!shouldDelete) {
    console.log("");
    console.log("Dry run only. No data deleted.");
    console.log("Run again with --yes to remove these users and their predictions:");
    console.log("npm run cleanup:load-test-users -- --yes");
    return;
  }

  await prisma.prediction.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });

  console.log(`Deleted ${users.length} LoadTester users and ${predictionCount} predictions.`);
}

main()
  .catch((error) => {
    console.error("Failed to clean up load-test users.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../lib/prisma.js");
    await prisma.$disconnect();
  });
