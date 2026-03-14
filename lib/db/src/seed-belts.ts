import { db, beltDefinitionsTable, beltRequirementsTable, beltExamsTable } from "./index";
import { eq, and } from "drizzle-orm";

const NINJUTSU_BELTS = [
  { name: "Blanco", color: "#FFFFFF", orderIndex: 0, description: "Inicio del camino ninja" },
  { name: "Amarillo", color: "#FFD700", orderIndex: 1, description: "Primer rayo de sol" },
  { name: "Naranja", color: "#FF8C00", orderIndex: 2, description: "Fuego interior" },
  { name: "Verde", color: "#228B22", orderIndex: 3, description: "Conexión con la naturaleza" },
  { name: "Azul", color: "#1E90FF", orderIndex: 4, description: "Fluidez del agua" },
  { name: "Morado", color: "#800080", orderIndex: 5, description: "Sabiduría profunda" },
  { name: "Marrón", color: "#8B4513", orderIndex: 6, description: "Raíces del guerrero" },
  { name: "Negro", color: "#000000", orderIndex: 7, description: "Dominio del arte" },
];

const JIUJITSU_BELTS = [
  { name: "Blanco", color: "#FFFFFF", orderIndex: 0, description: "Inicio del camino suave" },
  { name: "Azul", color: "#1E90FF", orderIndex: 1, description: "Comprensión de las bases" },
  { name: "Morado", color: "#800080", orderIndex: 2, description: "Técnica refinada" },
  { name: "Marrón", color: "#8B4513", orderIndex: 3, description: "Maestría cercana" },
  { name: "Negro", color: "#000000", orderIndex: 4, description: "Arte perfeccionado" },
];

const NINJUTSU_REQUIREMENTS: Record<string, { title: string; description: string }[]> = {
  Amarillo: [
    { title: "Posiciones básicas", description: "Kamae fundamentales" },
    { title: "Golpes básicos", description: "Tsuki y uchi" },
    { title: "Bloqueos", description: "Uke waza básicos" },
    { title: "Caídas", description: "Ukemi básico" },
  ],
  Naranja: [
    { title: "Patadas básicas", description: "Mae geri, yoko geri" },
    { title: "Combinaciones", description: "Secuencias de golpe-patada" },
    { title: "Esquivas", description: "Tai sabaki" },
    { title: "Kata básica", description: "Forma de demostración" },
  ],
  Verde: [
    { title: "Proyecciones", description: "Nage waza fundamentales" },
    { title: "Luxaciones", description: "Kansetsu waza básicas" },
    { title: "Defensa personal", description: "Escenarios de calle" },
    { title: "Kata intermedia", description: "Forma con armas" },
  ],
  Azul: [
    { title: "Armas tradicionales", description: "Bo, shuriken, kunai" },
    { title: "Técnicas de sigilo", description: "Shinobi iri" },
    { title: "Combate avanzado", description: "Randori controlado" },
    { title: "Estrategia", description: "Sun Tzu aplicado" },
  ],
  Morado: [
    { title: "Técnicas de espionaje", description: "Chōhō jutsu" },
    { title: "Medicina de campo", description: "Kusurigaku" },
    { title: "Supervivencia", description: "Inton jutsu" },
    { title: "Enseñanza", description: "Capacidad de instrucción" },
  ],
  "Marrón": [
    { title: "Dominio de armas", description: "Todas las armas tradicionales" },
    { title: "Combate múltiple", description: "Defensa contra múltiples oponentes" },
    { title: "Filosofía marcial", description: "Ninpō ikkan" },
    { title: "Liderazgo", description: "Dirigir entrenamientos" },
  ],
  Negro: [
    { title: "Examen completo", description: "Demostración total del arte" },
    { title: "Tesis marcial", description: "Documento de investigación" },
    { title: "Combate maestro", description: "Enfrentamiento con evaluadores" },
    { title: "Juramento", description: "Compromiso con el arte" },
  ],
};

const JIUJITSU_REQUIREMENTS: Record<string, { title: string; description: string }[]> = {
  Azul: [
    { title: "Guard passes", description: "Pasajes de guardia fundamentales" },
    { title: "Submissions", description: "Armbar, triangle, rear naked choke" },
    { title: "Sweeps", description: "Barridas desde guardia cerrada y abierta" },
    { title: "Examen de rol", description: "Sparring evaluado" },
  ],
  Morado: [
    { title: "Half guard", description: "Juego completo de media guardia" },
    { title: "Back control", description: "Dominio de la espalda" },
    { title: "Leg locks", description: "Straight ankle lock, kneebar" },
    { title: "Competition", description: "Participación en torneo" },
  ],
  "Marrón": [
    { title: "Instrucción", description: "Capacidad de enseñar técnicas" },
    { title: "Advanced submissions", description: "Heel hook, toe hold, calf slicer" },
    { title: "Wrestling", description: "Takedowns y control de pie" },
    { title: "Game plan", description: "Estrategia personal de competición" },
  ],
  Negro: [
    { title: "Mastery", description: "Dominio completo de todas las posiciones" },
    { title: "Teaching", description: "Programa de enseñanza propio" },
    { title: "Competition record", description: "Historial competitivo demostrable" },
    { title: "Thesis", description: "Contribución al arte" },
  ],
};

function getExamForBelt(name: string, discipline: string): { title: string; description: string; durationMinutes: number; passingScore: number } {
  const disc = discipline === "ninjutsu" ? "Ninjutsu" : "Jiujitsu";
  const descriptions: Record<string, string> = {
    Blanco: "Evaluación de conocimientos básicos y aptitud física para ingreso a la disciplina.",
    Amarillo: "Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.",
    Naranja: "Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.",
    Verde: "Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.",
    Azul: "Examen avanzado con evaluación de técnicas complejas, estrategia de combate y enseñanza básica.",
    Morado: "Examen avanzado con evaluación de técnicas complejas, estrategia de combate y enseñanza básica.",
    "Marrón": "Examen de maestría con evaluación exhaustiva de técnicas, liderazgo y capacidad de instrucción.",
    Negro: "Examen final de dan. Demostración completa del arte marcial, defensa personal avanzada y filosofía marcial.",
  };
  const durations: Record<string, number> = { Blanco: 30, Amarillo: 45, Naranja: 45, Verde: 60, Azul: 60, Morado: 90, "Marrón": 90, Negro: 120 };
  const scores: Record<string, number> = { Blanco: 60, Amarillo: 65, Naranja: 65, Verde: 70, Azul: 70, Morado: 75, "Marrón": 75, Negro: 80 };

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
