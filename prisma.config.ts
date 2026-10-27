import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Opcional aqui: o build (prisma generate) não acessa o banco e roda sem a variável.
    // Migrations continuam exigindo a DATABASE_URL e falham com aviso se ela faltar.
    url: process.env["DATABASE_URL"] ?? "",
  },
});
