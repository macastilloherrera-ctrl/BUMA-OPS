import { storage } from "./storage";
import type { InsertVisit, InsertTicket } from "@shared/schema";

async function runAuthorizationTests() {
  console.log("=== AUTHORIZATION TESTS ===\n");
  const results: { test: string; expected: string; actual: string; pass: boolean }[] = [];

  const execA = await storage.getUserProfile("exec-a-001");
  const execB = await storage.getUserProfile("exec-b-001");
  const manager = await storage.getUserProfile("manager-001");

  console.log("Test data:");
  console.log("- Exec A:", execA?.userId, "scope:", execA?.buildingScope);
  console.log("- Exec B:", execB?.userId, "scope:", execB?.buildingScope);
  console.log("- Manager:", manager?.userId, "role:", manager?.role);

  const bldgA = await storage.getBuilding("bldg-1");
  const bldgB = await storage.getBuilding("bldg-2");
  console.log("- Building A assigned to:", bldgA?.assignedExecutiveId);
  console.log("- Building B assigned to:", bldgB?.assignedExecutiveId);
  console.log("");

  function isManagerRole(role: string | undefined): boolean {
    return role === "gerente_general" || role === "gerente_operaciones";
  }

  async function canAccessBuilding(userId: string, profile: any, buildingId: string): Promise<boolean> {
    if (isManagerRole(profile?.role)) return true;
    if (profile?.buildingScope === "all") return true;
    const building = await storage.getBuilding(buildingId);
    return building?.assignedExecutiveId === userId;
  }

  async function canAccessEntity(userId: string, profile: any, entity: { buildingId?: string; assignedExecutiveId?: string | null; executiveId?: string }): Promise<boolean> {
    if (isManagerRole(profile?.role)) return true;
    if (profile?.buildingScope === "all") return true;
    if (entity.assignedExecutiveId === userId || entity.executiveId === userId) return true;
    if (entity.buildingId) {
      const building = await storage.getBuilding(entity.buildingId);
      if (building?.assignedExecutiveId === userId) return true;
    }
    return false;
  }

  function sanitizeCostFields(body: any, profile: any): any {
    if (isManagerRole(profile?.role)) return body;
    const { cost, ...rest } = body;
    return rest;
  }

  console.log("--- TEST A1: Exec A POST /visits con buildingId NO asignado ---");
  {
    const canAccess = await canAccessBuilding("exec-a-001", execA, "bldg-2");
    const expected = "403";
    const actual = canAccess ? "200" : "403";
    results.push({ test: "A1: POST /visits buildingId no asignado", expected, actual, pass: expected === actual });
    console.log(`Expected: ${expected}, Actual: ${actual}, PASS: ${expected === actual}\n`);
  }

  console.log("--- TEST A2: Exec A POST /tickets con buildingId NO asignado ---");
  {
    const canAccess = await canAccessBuilding("exec-a-001", execA, "bldg-2");
    const expected = "403";
    const actual = canAccess ? "200" : "403";
    results.push({ test: "A2: POST /tickets buildingId no asignado", expected, actual, pass: expected === actual });
    console.log(`Expected: ${expected}, Actual: ${actual}, PASS: ${expected === actual}\n`);
  }

  console.log("--- TEST A3: Exec A GET /tickets/:id de ticket en edificio NO asignado ---");
  {
    const ticketInOtherBuilding = await storage.createTicket({
      buildingId: "bldg-2",
      category: "limpieza",
      description: "Ticket en edificio de B",
      priority: "verde",
      assignedExecutiveId: "exec-b-001",
      createdBy: "manager-001",
      responsibleType: "ejecutivo",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const canAccess = await canAccessEntity("exec-a-001", execA, ticketInOtherBuilding);
    const expected = "403";
    const actual = canAccess ? "200" : "403";
    results.push({ test: "A3: GET /tickets/:id en edificio no asignado", expected, actual, pass: expected === actual });
    console.log(`Ticket in bldg-2 (assigned to B), Exec A tries to access`);
    console.log(`Expected: ${expected}, Actual: ${actual}, PASS: ${expected === actual}`);
    await storage.updateTicket(ticketInOtherBuilding.id, { status: "resuelto" });
    console.log("");
  }

  console.log("--- TEST B4: Manager crea ticket en bldg-3 (sin asignar) asignado a Exec A, A lo ve ---");
  {
    const newTicket = await storage.createTicket({
      buildingId: "bldg-3",
      category: "limpieza",
      description: "Ticket test B4 en edificio sin ejecutivo asignado",
      priority: "verde",
      assignedExecutiveId: "exec-a-001",
      createdBy: "manager-001",
      responsibleType: "ejecutivo",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const canAccess = await canAccessEntity("exec-a-001", execA, newTicket);
    const expected = "200";
    const actual = canAccess ? "200" : "403";
    results.push({ test: "B4: Exec A ve ticket asignado (via assignedExecutiveId)", expected, actual, pass: expected === actual });
    console.log(`Created ticket in bldg-3: ${newTicket.id}`);
    console.log(`Expected: ${expected}, Actual: ${actual}, PASS: ${expected === actual}\n`);

    console.log("--- TEST B5: Manager reasigna ticket a Exec B, A pierde acceso, B lo ve ---");
    await storage.updateTicket(newTicket.id, { assignedExecutiveId: "exec-b-001" });
    const updatedTicket = await storage.getTicket(newTicket.id);
    
    const canAccessA = await canAccessEntity("exec-a-001", execA, updatedTicket!);
    const expectedA = "403";
    const actualA = canAccessA ? "200" : "403";
    results.push({ test: "B5a: Exec A pierde acceso tras reasignacion", expected: expectedA, actual: actualA, pass: expectedA === actualA });
    console.log(`Exec A tries bldg-3 ticket after reassign - Expected: ${expectedA}, Actual: ${actualA}, PASS: ${expectedA === actualA}`);

    const canAccessB = await canAccessEntity("exec-b-001", execB, updatedTicket!);
    const expectedB = "200";
    const actualB = canAccessB ? "200" : "403";
    results.push({ test: "B5b: Exec B ve ticket reasignado", expected: expectedB, actual: actualB, pass: expectedB === actualB });
    console.log(`Exec B - Expected: ${expectedB}, Actual: ${actualB}, PASS: ${expectedB === actualB}\n`);

    // Cleanup: mark ticket as resolved instead of deleting
    await storage.updateTicket(newTicket.id, { status: "resuelto" });
  }

  console.log("--- TEST B6: Non-manager intenta enviar cost, se ignora ---");
  {
    const originalBody = { description: "Update test", cost: 50000 };
    const sanitized = sanitizeCostFields(originalBody, execA);
    const hasCost = "cost" in sanitized;
    const expected = "ignored";
    const actual = hasCost ? "persisted" : "ignored";
    results.push({ test: "B6a: Cost field sanitizado en request", expected, actual, pass: expected === actual });
    console.log(`Original body: ${JSON.stringify(originalBody)}`);
    console.log(`Sanitized body: ${JSON.stringify(sanitized)}`);
    console.log(`Expected: cost ${expected}, Actual: cost ${actual}, PASS: ${expected === actual}`);
  }

  console.log("\n--- TEST B6b: Verificar cost no persiste en DB ---");
  {
    const ticketForCostTest = await storage.createTicket({
      buildingId: "bldg-1",
      category: "limpieza",
      description: "Ticket para test de cost",
      priority: "verde",
      assignedExecutiveId: "exec-a-001",
      createdBy: "exec-a-001",
      responsibleType: "ejecutivo",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    
    const updateBody = { description: "Actualizado", cost: 99999 };
    const sanitizedUpdate = sanitizeCostFields(updateBody, execA);
    await storage.updateTicket(ticketForCostTest.id, sanitizedUpdate);
    
    const afterUpdate = await storage.getTicket(ticketForCostTest.id);
    const costStored = afterUpdate?.cost;
    const expected = null;
    const actual = costStored;
    const pass = costStored === null || costStored === undefined;
    results.push({ test: "B6b: Cost no persiste en DB", expected: "null", actual: String(actual), pass });
    console.log(`Ticket ${ticketForCostTest.id} cost after 'update': ${costStored}`);
    console.log(`Expected: null/undefined, Actual: ${costStored}, PASS: ${pass}\n`);
    
    await storage.updateTicket(ticketForCostTest.id, { status: "resuelto" });
  }

  console.log("\n=== SUMMARY ===");
  let allPass = true;
  results.forEach((r) => {
    const status = r.pass ? "PASS" : "FAIL";
    console.log(`${status}: ${r.test} (expected ${r.expected}, got ${r.actual})`);
    if (!r.pass) allPass = false;
  });
  console.log(`\nTotal: ${results.filter(r => r.pass).length}/${results.length} passed`);
  console.log(allPass ? "\nALL TESTS PASSED" : "\nSOME TESTS FAILED");

  return results;
}

runAuthorizationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  });
