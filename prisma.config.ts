import "dotenv/config";
import { defineConfig } from "prisma/config";
import { withExplicitSslMode } from "./lib/databaseUrl";

// Migrations need a direct connection (poolers such as Supabase's cannot run them).
const databaseUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl && withExplicitSslMode(databaseUrl),
  },
});
