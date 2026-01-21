import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users, userProfiles } from "../shared/schema";

const testUsers = [
  { email: "gerente.general@buma.cl", firstName: "Carlos", lastName: "Gerente", role: "gerente_general" },
  { email: "gerente.operaciones@buma.cl", firstName: "María", lastName: "Operaciones", role: "gerente_operaciones" },
  { email: "gerente.comercial@buma.cl", firstName: "Pedro", lastName: "Comercial", role: "gerente_comercial" },
  { email: "gerente.finanzas@buma.cl", firstName: "Laura", lastName: "Finanzas", role: "gerente_finanzas" },
  { email: "ejecutivo@buma.cl", firstName: "Juan", lastName: "Ejecutivo", role: "ejecutivo_operaciones" },
];

async function createTestUsers() {
  const password = "Test123!";
  const passwordHash = await bcrypt.hash(password, 10);

  for (const user of testUsers) {
    const userId = `test-${user.role}-${Date.now()}`;
    
    try {
      await db.insert(users).values({
        id: userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash,
        mustChangePassword: false,
      }).onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash,
          mustChangePassword: false,
        }
      });

      const existingProfile = await db.query.userProfiles.findFirst({
        where: (p, { eq }) => eq(p.userId, userId)
      });

      if (!existingProfile) {
        await db.insert(userProfiles).values({
          userId,
          role: user.role as any,
          buildingScope: user.role === "ejecutivo_operaciones" ? "assigned" : "all",
          isActive: true,
        }).onConflictDoNothing();
      }

      console.log(`Usuario creado: ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`Error creando ${user.email}:`, error);
    }
  }

  console.log("\n=== USUARIOS DE PRUEBA ===");
  console.log("Contraseña para todos: Test123!");
  console.log("");
  testUsers.forEach(u => {
    console.log(`${u.role.padEnd(25)} -> ${u.email}`);
  });

  process.exit(0);
}

createTestUsers();
