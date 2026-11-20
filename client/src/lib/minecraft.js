/* Minecraft knowledge used by the Home page, the Worlds panel and /minecraft.
   Facts are intentionally timeless (no version numbers or dates that go stale). */

export const WORLDS = [
  {
    id: 'overworld', n: '01', name: 'Overworld', tag: 'Where every story starts', img: '/images/world-overworld.webp', tone: '#4a6fa5',
    blurb: 'The default dimension: a procedurally generated, practically endless landscape of forests, deserts, jungles, mountains, caves and oceans. Day turns to night, and night brings monsters.',
    facts: ['Dozens of biomes, from snowy taiga to mushroom islands', 'Villages, strongholds, mineshafts and ancient structures to find', 'Cows, sheep, pigs and villagers by day; zombies, skeletons and creepers after dark'],
  },
  {
    id: 'nether', n: '02', name: 'The Nether', tag: 'A burning underworld', img: '/images/world-nether.webp', tone: '#a5423a',
    blurb: 'A hot, hostile dimension reached through a portal built from obsidian. Lava oceans, towering fortresses and fungus forests — and the only source of netherite.',
    facts: ['Travelling 1 block here equals 8 blocks in the Overworld', 'Bastions, fortresses, piglins and ghasts', 'Home of ancient debris, the rarest building upgrade'],
  },
  {
    id: 'end', n: '03', name: 'The End', tag: 'Dragon, void and islands', img: '/images/world-end.webp', tone: '#8a7fc2',
    blurb: 'A quiet field of floating islands in the void, guarded by the Ender Dragon. Beat it and the outer islands open up, with End cities, ships and elytra wings.',
    facts: ['Reached through a stronghold portal using eyes of ender', 'Obsidian pillars topped with healing crystals', 'Shulkers and End cities hold some of the best loot'],
  },
  {
    id: 'deep', n: '04', name: 'Deep Dark', tag: 'Silence is a feature', img: '/images/world-deep.webp', tone: '#2f6b78',
    blurb: 'A biome deep underground in the Overworld, made of sculk and ancient cities. Sneak carefully — vibrations are heard by something that should not be woken.',
    facts: ['Sculk sensors react to sound and movement', 'Ancient cities hide rare loot', 'Home of the Warden, one of the toughest mobs'],
  },
  {
    id: 'ocean', n: '05', name: 'Oceans', tag: 'Reefs and ruins', img: '/images/world-ocean.webp', tone: '#c9a24a',
    blurb: 'The Overworld’s seas: warm coral reefs, cold deep waters, shipwrecks and drowned ruins. Ocean monuments and tridents make the sea an adventure of its own.',
    facts: ['Ocean monuments guarded by guardians', 'Shipwrecks and buried treasure maps', 'Coral reefs full of colour and fish'],
  },
];

export const MODES = [
  { name: 'Survival', note: 'Gather resources, craft tools, manage health and hunger, and survive the night.' },
  { name: 'Creative', note: 'Unlimited blocks, flying and no damage. Built for huge builds and redstone machines.' },
  { name: 'Adventure', note: 'Made for custom maps: blocks can only be broken with the right tools or rules.' },
  { name: 'Spectator', note: 'Fly through blocks and watch the world without interacting with it.' },
  { name: 'Hardcore', note: 'Survival on the hardest difficulty with a single life. One death ends the world.' },
];

export const MOBS = [
  { group: 'Passive', items: 'Cows, sheep, pigs, chickens, rabbits, bees', note: 'Food, wool and leather. Safe to farm.' },
  { group: 'Neutral', items: 'Endermen, wolves, iron golems, piglins', note: 'Leave them alone and they leave you alone.' },
  { group: 'Hostile', items: 'Zombies, skeletons, creepers, spiders, witches', note: 'They spawn in the dark. Light up your base.' },
  { group: 'Bosses', items: 'Ender Dragon, Wither', note: 'Big fights with big rewards.' },
];

export const FACTS = [
  ['Created by', 'Markus "Notch" Persson'],
  ['Developed by', 'Mojang Studios'],
  ['Owned by', 'Microsoft, since 2014'],
  ['Editions', 'Java · Bedrock'],
  ['Game modes', 'Survival · Creative · Adventure · Spectator'],
  ['Dimensions', 'Overworld · Nether · The End'],
  ['Sales', 'The best-selling video game of all time'],
];

export const EDITIONS = [
  ['', 'Java Edition', 'Bedrock Edition'],
  ['Platforms', 'Windows, macOS, Linux', 'Windows, consoles, phones and tablets'],
  ['Mods', 'Huge mod scene (Fabric, Forge, NeoForge)', 'Add-ons and marketplace content'],
  ['Server software', 'Vanilla, Paper, Spigot, Fabric, Forge', 'Bedrock Dedicated Server, plus proxies'],
  ['Plugins', 'Yes — Paper and Spigot plugins', 'Limited; behaviour packs instead'],
  ['Cross-play', 'Java players only', 'Across Bedrock platforms'],
];

export const RAM_GUIDE = [
  ['Friends server', '1–5 players, vanilla', 'about 2 GB'],
  ['Plugin server', '10–20 players, 10–20 plugins', 'about 4 GB'],
  ['Community', '30+ players, heavier plugins', '6–8 GB'],
  ['Modpack', 'Large modpacks, any size', '8 GB or more'],
];

export const GUIDES = [
  { id: 'editions', title: 'Java or Bedrock? Pick the right server', read: '3 min', img: '/images/world-overworld.webp', tone: '#4a6fa5', desc: 'Where your friends play decides the edition. Here is what changes for plugins, mods and cross-play.' },
  { id: 'servers', title: 'How much RAM does your Minecraft server need?', read: '4 min', img: '/images/world-nether.webp', tone: '#a5423a', desc: 'A simple sizing guide from a small friends world up to a full community or modpack.' },
  { id: 'mods', title: 'Plugins vs mods: what is the difference?', read: '4 min', img: '/images/world-end.webp', tone: '#8a7fc2', desc: 'Plugins change the server; mods change the game. Learn which one you actually need.' },
];

export const MARQUEE = [
  ['pickaxe', 'Survival'], ['diamond', 'Creative'], ['sword', 'PvP'], ['shield', 'DDoS protection'], ['bolt', 'NVMe storage'],
  ['heart', 'Hardcore'], ['fire', 'The Nether'], ['star', 'Mods & plugins'], ['cube', 'Java & Bedrock'], ['gift', 'Free migration'],
];
