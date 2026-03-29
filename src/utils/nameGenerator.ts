// Random name generator for cast and crew members

const FIRST_NAMES = [
  'James', 'Maria', 'David', 'Sofia', 'Marcus', 'Elena',
  'Jaylen', 'Priya', 'Oliver', 'Anika', 'Tobias', 'Luna',
  'Rafael', 'Mei', 'Isaiah', 'Fatima', 'Sebastian', 'Yuki',
  'Dante', 'Camille', 'Nico', 'Amara', 'Felix', 'Zara',
  'Rowan', 'Sage', 'Kai', 'Nadia', 'Julian', 'Iris',
];

const LAST_NAMES = [
  'Chen', 'Rodriguez', 'Park', 'Okafor', 'Singh', 'Williams',
  'Nakamura', 'Davis', 'Petrov', 'Martinez', 'Kim', 'Johnson',
  'Delgado', 'Okonkwo', 'Fischer', 'Patel', 'Brooks', 'Tanaka',
  'Moreau', 'Gutierrez', 'Lee', 'Thompson', 'Rossi', 'Hassan',
  'Novak', 'Rivera', 'Anderson', 'Johansson', 'Cruz', 'Bailey',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateName(): string {
  return `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
}

export function generateNames(count: number): string[] {
  const names: string[] = [];
  const used = new Set<string>();
  while (names.length < count) {
    const name = generateName();
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
  }
  return names;
}
