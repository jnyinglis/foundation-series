// Named worlds from Isaac Asimov's Foundation series.
// Asimov gives almost no coordinates, so positions are plausible placements:
// Trantor near the galactic core, Terminus and the Four Kingdoms on the rim,
// Earth and the Spacer worlds in the Sirius sector.

export type PlanetType = 'terrestrial' | 'desert' | 'ice' | 'ocean' | 'metal' | 'barren' | 'lush';

export interface World {
  id: string;
  name: string;
  region: string;
  type: PlanetType;
  seed: number;
  /** Galactic position. Units are map units (1 unit ~ 500 light years). */
  pos: [number, number, number];
  population: string;
  starColor: string;
  starName: string;
  lore: string;
  /** Planet radius in scene units. */
  radius: number;
  hasRings?: boolean;
  moons?: number;
}

function polar(r: number, deg: number, y = 0): [number, number, number] {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

export const WORLDS: World[] = [
  {
    id: 'trantor', name: 'Trantor', region: 'Galactic Core', type: 'metal', seed: 11,
    pos: polar(2, 0, 0.2), population: '40,000,000,000', starColor: '#ffe9c4', starName: 'Trantor Prime',
    radius: 320, moons: 1,
    lore: 'Capital of the Galactic Empire. The whole surface lies under one continuous city of steel and ceramic. Twenty agricultural worlds feed it. Here Hari Seldon founded psychohistory and here, in the Library, the Second Foundation hides in plain sight.',
  },
  {
    id: 'helicon', name: 'Helicon', region: 'Galactic Core', type: 'terrestrial', seed: 23,
    pos: polar(6, 40, -0.6), population: '1,200,000,000', starColor: '#fff4e0', starName: 'Helicon',
    radius: 280,
    lore: 'Birthplace of Hari Seldon. A quiet agricultural world in the Imperial interior, known for its mathematicians and its wrestlers.',
  },
  {
    id: 'synnax', name: 'Synnax', region: 'Blue Drift', type: 'ocean', seed: 31,
    pos: polar(9, 300, 0.9), population: '800,000,000', starColor: '#d6e6ff', starName: 'Synnax',
    radius: 290, moons: 2,
    lore: 'Home of Gaal Dornick, who travelled to Trantor to join the Seldon Project and became the historian of its first days. A world of wide seas and scattered islands.',
  },
  {
    id: 'neotrantor', name: 'Neotrantor', region: 'Galactic Core', type: 'lush', seed: 47,
    pos: polar(4, 120, 0.4), population: '20,000,000', starColor: '#ffefd5', starName: 'Delicass',
    radius: 260,
    lore: 'Once a pastoral retreat called Delicass. After the Great Sack of Trantor it became the seat of a hollow Empire of twenty worlds, ruled by Dagobert IX.',
  },
  {
    id: 'siwenna', name: 'Siwenna', region: 'Normannic Sector', type: 'terrestrial', seed: 53,
    pos: polar(30, 330, -1.1), population: '2,500,000,000', starColor: '#fff0dc', starName: 'Siwenna',
    radius: 300,
    lore: 'Former capital of the Normannic Sector, ruined by the Imperial purges. Ducem Barr told Hober Mallow of Imperial power here, and later aided the Foundation against General Bel Riose.',
  },
  {
    id: 'terminus', name: 'Terminus', region: 'The Periphery', type: 'terrestrial', seed: 1,
    pos: polar(49, 20, 0.5), population: '100,000 (F.E. 1)', starColor: '#fff8ea', starName: 'Terminus',
    radius: 240,
    lore: 'A metal-poor world at the extreme edge of the Galaxy. Home of the Encyclopedia Galactica, the Time Vault, and the Foundation that will shorten the coming dark age from thirty thousand years to one thousand.',
  },
  {
    id: 'anacreon', name: 'Anacreon', region: 'The Four Kingdoms', type: 'terrestrial', seed: 7,
    pos: polar(46, 10, 1.3), population: '19,000,000,000', starColor: '#ffe6cc', starName: 'Anacreon',
    radius: 310, moons: 1,
    lore: 'The largest of the Four Kingdoms that broke from the Empire. Its ambition to seize Terminus caused the first Seldon Crisis. The Foundation answered with the religion of science.',
  },
  {
    id: 'smyrno', name: 'Smyrno', region: 'The Four Kingdoms', type: 'desert', seed: 13,
    pos: polar(46, 28, -0.4), population: '5,000,000,000', starColor: '#ffd9b3', starName: 'Smyrno',
    radius: 270,
    lore: 'A hot and mercantile kingdom, rival of Anacreon. Smyrnian traders were quick to adopt Foundation gadgets.',
  },
  {
    id: 'konom', name: 'Konom', region: 'The Four Kingdoms', type: 'terrestrial', seed: 17,
    pos: polar(45, 32, 0.8), population: '3,000,000,000', starColor: '#fff2e2', starName: 'Konom',
    radius: 250,
    lore: 'A smaller kingdom of the Periphery, cautious and devout. Its priests were trained on Terminus.',
  },
  {
    id: 'daribow', name: 'Daribow', region: 'The Four Kingdoms', type: 'terrestrial', seed: 19,
    pos: polar(44, 16, -1.0), population: '2,000,000,000', starColor: '#ffe9d1', starName: 'Daribow',
    radius: 255,
    lore: 'The fourth of the breakaway kingdoms. Thinly settled, it depended on Anacreon for metals and on the Foundation for power.',
  },
  {
    id: 'askone', name: 'Askone', region: 'The Periphery', type: 'terrestrial', seed: 29,
    pos: polar(42, 35, 0.3), population: '4,000,000,000', starColor: '#fff4e4', starName: 'Askone',
    radius: 285,
    lore: 'A world of strict ancestral taboos that banned atomic devices. Trader Limmar Ponyets broke the taboo with a transmuter and a bribe.',
  },
  {
    id: 'korell', name: 'Korell', region: 'The Periphery', type: 'desert', seed: 37,
    pos: polar(40, 25, 0.9), population: '6,000,000,000', starColor: '#ffd6a8', starName: 'Korell',
    radius: 295,
    lore: 'The Republic of Korell, ruled by Commdor Asper Argo. Its war against the Foundation ended without a shot, strangled by the trade embargo of Hober Mallow.',
  },
  {
    id: 'glyptal', name: 'Glyptal IV', region: 'The Periphery', type: 'barren', seed: 41,
    pos: polar(44, 0, -0.7), population: '400,000', starColor: '#e8e8ff', starName: 'Glyptal',
    radius: 200,
    lore: 'A thinly settled mining world on the edge of Foundation trade routes.',
  },
  {
    id: 'haven', name: 'Haven', region: 'Independent Traders', type: 'ice', seed: 43,
    pos: polar(43, 40, -1.4), population: '350,000,000', starColor: '#e0ecff', starName: 'Haven',
    radius: 230,
    lore: 'A cold and bleak world where the Independent Traders built their caverns and their fleets. Toran and Bayta Darell called it home before the Mule took it.',
  },
  {
    id: 'iss', name: 'Iss', region: 'Independent Traders', type: 'terrestrial', seed: 59,
    pos: polar(47, 45, 0.6), population: '600,000,000', starColor: '#fff6e8', starName: 'Iss',
    radius: 245,
    lore: 'One of the Trader worlds that resisted the Mayor of Terminus and later fought the Mule.',
  },
  {
    id: 'mnemon', name: 'Mnemon', region: 'Independent Traders', type: 'terrestrial', seed: 61,
    pos: polar(41, 48, 1.2), population: '900,000,000', starColor: '#fff0e0', starName: 'Mnemon',
    radius: 265,
    lore: 'A Trader world whose fleets gathered at Radole to decide on war against the Foundation.',
  },
  {
    id: 'radole', name: 'Radole', region: 'Independent Traders', type: 'desert', seed: 67,
    pos: polar(39, 18, -0.2), population: '50,000,000', starColor: '#ffddb0', starName: 'Radole',
    radius: 240,
    lore: 'A ribbon world that always shows one face to its sun. Life clings to the narrow band of twilight between fire and ice. Here the Traders met as the Mule rose.',
  },
  {
    id: 'kalgan', name: 'Kalgan', region: 'The Mule', type: 'lush', seed: 71,
    pos: polar(35, 60, 0.0), population: '3,000,000,000', starColor: '#fff2d9', starName: 'Kalgan',
    radius: 300, hasRings: true,
    lore: 'The pleasure world of the Galaxy, where the rich went to play. The Mule took it in a day and made it the capital of his Union of Worlds. Later the home of Lord Stettin and the start of the Kalganian war.',
  },
  {
    id: 'tazenda', name: 'Tazenda', region: 'The Mule', type: 'ice', seed: 73,
    pos: polar(40, 75, 1.0), population: '27,000,000', starColor: '#dde8ff', starName: 'Tazenda',
    radius: 250,
    lore: 'A rural oligarchy of twenty-seven worlds that the Mule mistook for the Second Foundation. Its name means Star\'s End in the Old Tongue. He burned it.',
  },
  {
    id: 'rossem', name: 'Rossem', region: 'The Mule', type: 'ice', seed: 79,
    pos: polar(42, 78, -0.9), population: '3,000,000', starColor: '#e8f0ff', starName: 'Rossem',
    radius: 220,
    lore: 'A cold and poor world of fur-wrapped farmers, subject to Tazenda. Bail Channis led the Mule here to find the Second Foundation. He found Preem Palver instead.',
  },
  {
    id: 'nishaya', name: 'Nishaya', region: 'The Periphery', type: 'terrestrial', seed: 83,
    pos: polar(38, 55, 0.5), population: '700,000,000', starColor: '#fff5e6', starName: 'Nishaya',
    radius: 260,
    lore: 'A world of goat herders and plain speech, far from the centers of power.',
  },
  {
    id: 'santanni', name: 'Santanni', region: 'Imperial Provinces', type: 'terrestrial', seed: 89,
    pos: polar(33, 100, -0.5), population: '7,000,000,000', starColor: '#ffeedb', starName: 'Santanni',
    radius: 300,
    lore: 'An Imperial province that rebelled in the dying years of Seldon\'s life. His son Raych died here.',
  },
  {
    id: 'sark', name: 'Sark', region: 'Imperial Provinces', type: 'terrestrial', seed: 97,
    pos: polar(20, 150, 0.7), population: '3,000,000,000', starColor: '#fff3e3', starName: 'Sark',
    radius: 280,
    lore: 'A wealthy world that grew rich on kyrt, the fibre of Florina. Its Great Squires ruled the Florinians as a lower caste.',
  },
  {
    id: 'florina', name: 'Florina', region: 'Imperial Provinces', type: 'lush', seed: 101,
    pos: polar(21, 153, 0.5), population: '500,000,000', starColor: '#ffe2bb', starName: 'Florina',
    radius: 270,
    lore: 'The only world where kyrt will grow. Its sun lay in the path of a current of space that would one day make it a nova.',
  },
  {
    id: 'vega', name: 'Vega', region: 'Sirius Sector', type: 'terrestrial', seed: 103,
    pos: polar(24, 170, -0.3), population: '4,000,000,000', starColor: '#e6ecff', starName: 'Vega',
    radius: 290,
    lore: 'An ancient world of the first Settler wave, close to the old Sirius Sector.',
  },
  {
    id: 'sayshell', name: 'Sayshell', region: 'Sayshell Union', type: 'desert', seed: 107,
    pos: polar(30, 200, 0.8), population: '2,000,000,000', starColor: '#ffe4c0', starName: 'Sayshell',
    radius: 275,
    lore: 'Capital of the Sayshell Union, an independent pocket the Foundation never absorbed. Golan Trevize and Janov Pelorat came here on the trail of Earth, and left on the trail of Gaia.',
  },
  {
    id: 'gaia', name: 'Gaia', region: 'Sayshell Union', type: 'lush', seed: 109,
    pos: polar(31, 205, 1.1), population: 'One', starColor: '#fff0dc', starName: 'Gaia',
    radius: 280, moons: 1,
    lore: 'A living world. Every rock, every tree, every person shares one mind. Here Trevize chose the future of the Galaxy: Galaxia.',
  },
  {
    id: 'comporellon', name: 'Comporellon', region: 'Sirius Sector', type: 'ice', seed: 113,
    pos: polar(29, 230, -0.6), population: '1,000,000,000', starColor: '#dfe8ff', starName: 'Comporellon',
    radius: 300,
    lore: 'A cold world of a puritan people who claimed to be the oldest settlement, and who kept the coordinates of the Spacer worlds in a dead archive.',
  },
  {
    id: 'aurora', name: 'Aurora', region: 'Spacer Worlds', type: 'terrestrial', seed: 127,
    pos: polar(28, 236, 0.4), population: 'None', starColor: '#fff8ec', starName: 'Tau Ceti',
    radius: 285,
    lore: 'The World of the Dawn, first and greatest of the fifty Spacer worlds. Now empty. Feral dogs hunt among the ruins.',
  },
  {
    id: 'solaria', name: 'Solaria', region: 'Spacer Worlds', type: 'terrestrial', seed: 131,
    pos: polar(27, 240, -0.9), population: '1,200', starColor: '#fff3e0', starName: 'Solaria',
    radius: 260,
    lore: 'The last Spacer world. Its hermaphrodite inhabitants live alone on vast estates, served by robots. They do not welcome visitors.',
  },
  {
    id: 'melpomenia', name: 'Melpomenia', region: 'Spacer Worlds', type: 'barren', seed: 137,
    pos: polar(26, 250, 0.2), population: 'None', starColor: '#ffe8d0', starName: 'Melpomenia',
    radius: 240,
    lore: 'A dead world with a thin and poisoned air. In its ruined hall of records Trevize found the coordinates of the fifty Spacer worlds.',
  },
  {
    id: 'alpha', name: 'Alpha', region: 'Sirius Sector', type: 'ocean', seed: 139,
    pos: polar(28, 245, 0.0), population: '25,000', starColor: '#fff5e8', starName: 'Alpha Centauri',
    radius: 270,
    lore: 'An ocean world with a single island, New Earth, terraformed by the refugees of Earth. Warm, welcoming, and quietly deadly.',
  },
  {
    id: 'earth', name: 'Earth', region: 'Sirius Sector', type: 'barren', seed: 149,
    pos: polar(28, 244, -0.4), population: 'None', starColor: '#fff6e8', starName: 'Sol',
    radius: 255, moons: 1,
    lore: 'The forgotten world of origin. Its crust is radioactive and its records are erased. On its great Moon, R. Daneel Olivaw waits.',
  },
];

export const START_WORLD_ID = 'terminus';
export const JUMP_RANGE = 12;
export const FUEL_CAPACITY = 60;

export function worldById(id: string): World {
  const w = WORLDS.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown world ${id}`);
  return w;
}

export function distance(a: World, b: World): number {
  const dx = a.pos[0] - b.pos[0];
  const dy = a.pos[1] - b.pos[1];
  const dz = a.pos[2] - b.pos[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
