import MinecraftWorld from './MinecraftWorld';

/* Decorative texture + ambient animation behind the whole site.
   Which layers are visible (and how they look) is decided per theme in
   themes.css; the "Background" switch can pause or hide them entirely. */
const TILES = [
  { x: '4%', y: '12%', w: '240px', h: '150px', d: '0s' },
  { x: '70%', y: '6%', w: '210px', h: '130px', d: '-2s' },
  { x: '82%', y: '58%', w: '250px', h: '160px', d: '-4s' },
  { x: '-2%', y: '64%', w: '220px', h: '140px', d: '-6s' },
  { x: '44%', y: '78%', w: '200px', h: '120px', d: '-3s' },
  { x: '30%', y: '-4%', w: '170px', h: '110px', d: '-5s' },
];

export default function BackgroundFX() {
  return (
    <div className="fx" aria-hidden="true">
      <div className="fx-image" />
      <div className="fx-dots" />
      <div className="fx-blob-a" />
      <div className="fx-blob-b" />
      <div className="fx-tiles">
        {TILES.map((t) => (
          <span key={t.x + t.y} style={{ '--x': t.x, '--y': t.y, '--w': t.w, '--h': t.h, '--d': t.d }} />
        ))}
      </div>
      <div className="fx-glow" />
      <div className="fx-stripes-a" />
      <div className="fx-stripes-b" />
      <div className="fx-scan" />
      <div className="fx-grain" />
      <div className="fx-crt" />
      <MinecraftWorld />
    </div>
  );
}
