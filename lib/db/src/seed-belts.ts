import { db, beltDefinitionsTable, beltRequirementsTable, beltExamsTable } from "./index";
import { eq, and } from "drizzle-orm";

const NINJUTSU_BELTS = [
  { name: "Blanco", color: "#FFFFFF", orderIndex: 0, description: "Inicio del camino ninja" },
  { name: "Amarillo", color: "#FFD700", orderIndex: 1, description: "Primer rayo de sol" },
  { name: "Azul", color: "#1E90FF", orderIndex: 2, description: "Fluidez del agua" },
  { name: "Azul franja roja", color: "#1E90FF", orderIndex: 3, description: "Transición avanzada — cinturón azul con franja roja" },
  { name: "Rojo", color: "#CC0000", orderIndex: 4, description: "Fuego del guerrero" },
  { name: "Verde", color: "#228B22", orderIndex: 5, description: "Conexión con la naturaleza" },
  { name: "Marrón", color: "#8B4513", orderIndex: 6, description: "Raíces del guerrero" },
  { name: "Violeta", color: "#6A0DAD", orderIndex: 7, description: "Sabiduría profunda" },
  { name: "Violeta punta negra", color: "#4B0082", orderIndex: 8, description: "A las puertas del dominio" },
  { name: "Negro", color: "#000000", orderIndex: 9, description: "Dominio del arte" },
];

const JIUJITSU_BELTS: typeof NINJUTSU_BELTS = [];

const NINJUTSU_REQUIREMENTS: Record<string, { title: string; description: string }[]> = {
  Amarillo: [
    { title: "Posiciones básicas", description: "Kamae fundamentales" },
    { title: "Golpes básicos", description: "Tsuki y uchi" },
    { title: "Bloqueos", description: "Uke waza básicos" },
    { title: "Caídas", description: "Ukemi básico" },
  ],
  Azul: [
    { title: "Patadas básicas", description: "Mae geri, yoko geri" },
    { title: "Combinaciones", description: "Secuencias de golpe-patada" },
    { title: "Esquivas", description: "Tai sabaki" },
    { title: "Kata básica", description: "Forma de demostración" },
  ],
  "Azul franja roja": [
    { title: "Armas tradicionales — introducción", description: "Bo, shuriken, kunai básico" },
    { title: "Técnicas de sigilo — iniciación", description: "Shinobi iri básico" },
    { title: "Combate intermedio", description: "Randori básico controlado" },
    { title: "Kata intermedia", description: "Forma de transición" },
  ],
  Rojo: [
    { title: "Proyecciones", description: "Nage waza fundamentales" },
    { title: "Luxaciones", description: "Kansetsu waza básicas" },
    { title: "Defensa personal", description: "Escenarios de calle" },
    { title: "Kata avanzada", description: "Forma con armas" },
  ],
  Verde: [
    { title: "Armas tradicionales", description: "Bo, shuriken, kunai dominio" },
    { title: "Técnicas de sigilo", description: "Shinobi iri avanzado" },
    { title: "Combate avanzado", description: "Randori controlado" },
    { title: "Estrategia", description: "Sun Tzu aplicado" },
  ],
  Marrón: [
    { title: "Dominio de armas", description: "Todas las armas tradicionales" },
    { title: "Combate múltiple", description: "Defensa contra múltiples oponentes" },
    { title: "Filosofía marcial", description: "Ninpō ikkan" },
    { title: "Liderazgo", description: "Dirigir entrenamientos" },
  ],
  Violeta: [
    { title: "Técnicas de espionaje", description: "Chōhō jutsu" },
    { title: "Medicina de campo", description: "Kusurigaku" },
    { title: "Supervivencia", description: "Inton jutsu" },
    { title: "Enseñanza", description: "Capacidad de instrucción" },
  ],
  "Violeta punta negra": [
    { title: "Integración completa", description: "Dominio de todas las técnicas anteriores" },
    { title: "Mentoring", description: "Guía de alumnos de rangos inferiores" },
    { title: "Filosofía avanzada", description: "Ninpō en la vida cotidiana" },
    { title: "Kata maestra", description: "Creación de forma personal" },
  ],
  Negro: [
    { title: "Examen completo", description: "Demostración total del arte" },
    { title: "Tesis marcial", description: "Documento de investigación" },
    { title: "Combate maestro", description: "Enfrentamiento con evaluadores" },
    { title: "Juramento", description: "Compromiso con el arte" },
  ],
};

const JIUJITSU_REQUIREMENTS: Record<string, { title: string; description: string }[]> = {};

function getExamForBelt(name: string, discipline: string): { title: string; description: string; durationMinutes: number; passingScore: number } {
  const disc = discipline === "ninjutsu" ? "Ninjutsu" : "Jiujitsu";
  const descriptions: Record<string, string> = {
    Blanco: "Evaluación de conocimientos básicos y aptitud física para ingreso a la disciplina.",
    Amarillo: "Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.",
    Azul: "Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.",
    "Azul franja roja": "Evaluación de transición con énfasis en sigilo y armas básicas.",
    Rojo: "Evaluación avanzada con proyecciones, luxaciones y defensa personal.",
    Verde: "Examen avanzado con evaluación de técnicas complejas, estrategia de combate y enseñanza básica.",
    Marrón: "Examen de maestría con evaluación exhaustiva de técnicas, liderazgo y capacidad de instrucción.",
    Violeta: "Examen avanzado con técnicas de espionaje, supervivencia y enseñanza.",
    "Violeta punta negra": "Examen de integración: dominio completo, mentoring y filosofía.",
    Negro: "Examen final de dan. Demostración completa del arte marcial, defensa personal avanzada y filosofía marcial.",
  };
  const durations: Record<string, number> = {
    Blanco: 30, Amarillo: 45, Azul: 45, "Azul franja roja": 60,
    Rojo: 60, Verde: 60, Marrón: 90, Violeta: 90, "Violeta punta negra": 90, Negro: 120,
  };
  const scores: Record<string, number> = {
    Blanco: 60, Amarillo: 65, Azul: 65, "Azul franja roja": 68,
    Rojo: 70, Verde: 70, Marrón: 75, Violeta: 75, "Violeta punta negra": 78, Negro: 80,
  };

  return {
    title: name === "Blanco" ? `Examen de Ingreso ${disc}` : `Examen Cinturón ${name} ${disc}`,
    description: descriptions[name] || "",
    durationMinutes: durations[name] || 60,
    passingScore: scores[name] || 70,
  };
}

export async function seedBelts() {
  console.log("Seeding belt definitions...");

  for (const belt of NINJUTSU_BELTS) {
    const existing = await db
      .select()
      .from(beltDefinitionsTable)
      .where(and(eq(beltDefinitionsTable.discipline, "ninjutsu"), eq(beltDefinitionsTable.orderIndex, belt.orderIndex)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(beltDefinitionsTable).values({ ...belt, discipline: "ninjutsu" });
    }
  }

  for (const belt of JIUJITSU_BELTS) {
    const existing = await db
      .select()
      .from(beltDefinitionsTable)
      .where(and(eq(beltDefinitionsTable.discipline, "jiujitsu"), eq(beltDefinitionsTable.orderIndex, belt.orderIndex)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(beltDefinitionsTable).values({ ...belt, discipline: "jiujitsu" });
    }
  }

  const allBelts = await db.select().from(beltDefinitionsTable);

  for (const belt of allBelts) {
    const reqs = belt.discipline === "ninjutsu"
      ? NINJUTSU_REQUIREMENTS[belt.name]
      : JIUJITSU_REQUIREMENTS[belt.name];

    if (reqs) {
      const existingReqs = await db
        .select()
        .from(beltRequirementsTable)
        .where(eq(beltRequirementsTable.beltId, belt.id))
        .limit(1);

      if (existingReqs.length === 0) {
        for (let i = 0; i < reqs.length; i++) {
          await db.insert(beltRequirementsTable).values({
            beltId: belt.id,
            title: reqs[i].title,
            description: reqs[i].description,
            orderIndex: i + 1,
          });
        }
      }
    }

    const existingExam = await db
      .select()
      .from(beltExamsTable)
      .where(eq(beltExamsTable.beltId, belt.id))
      .limit(1);

    if (existingExam.length === 0) {
      const exam = getExamForBelt(belt.name, belt.discipline);
      await db.insert(beltExamsTable).values({
        beltId: belt.id,
        ...exam,
      });
    }
  }

  console.log("Belt seed complete.");
}
