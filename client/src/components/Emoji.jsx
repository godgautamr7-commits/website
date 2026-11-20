/* Legacy Cloud custom emoji — hand-made pixel art, drawn as crisp SVG.
   Use <Emoji name="gift" /> or write :gift: inside any text rendered with <Rich>.
   Normal (system) emoji are replaced automatically by <Rich> so the site never
   shows platform emoji. */

const P = {
  Y: '#ffd23f', L: '#ff7a7a', R: '#e63946', D: '#9b1d28', W: '#ffffff', K: '#2b2b33',
  C: '#4fe3d6', B: '#17a39c', G: '#9aa0a6', S: '#e5e7eb', H: '#8b5a2b', O: '#ff8a1f', E: '#ffb347',
  N: '#5fa84a', M: '#3f7d34', T: '#8a5a3a', U: '#3b82f6', V: '#1d4ed8', P: '#b57cff',
};

const ART = {
  gift: [
    '..YYY..YYY..',
    '.YYYYYYYYYY.',
    '..YYYYYYYY..',
    'LLLLLYYLLLLL',
    'LLLLLYYLLLLL',
    '.RRRRYYRRRR.',
    '.RRRRYYRRRR.',
    '.RRRRYYRRRR.',
    '.RRRRYYRRRR.',
    '.RRRRYYRRRD.',
    '.DDDDYYDDDD.',
  ],
  diamond: [
    '...CCCCCC...',
    '..CWWCCCCB..',
    '.CWWCCCCCCB.',
    'CCCCCCCCCCBB',
    '.BCCCCCCCBB.',
    '..BCCCCCBB..',
    '...BCCCBB...',
    '....BCBB....',
    '.....BB.....',
  ],
  pickaxe: [
    '...GGGGGG...',
    '..GSSSSGGG..',
    '.GG..HH.GGG.',
    '.G...HH...G.',
    '.....HH.....',
    '....HH......',
    '...HH.......',
    '..HH........',
    '.HH.........',
    'HH..........',
  ],
  sword: [
    '..........SS',
    '.........SSG',
    '........SSG.',
    '.......SSG..',
    '......SSG...',
    '.K...SSG....',
    '..KKSSG.....',
    '...KKG......',
    '..HHKK......',
    '.HH..K......',
    'HH..........',
  ],
  heart: [
    '..RRR..RRR..',
    '.RWRRRRRRRR.',
    '.RWRRRRRRRR.',
    '.RRRRRRRRDR.',
    '..RRRRRRRD..',
    '...RRRRRD...',
    '....RRRD....',
    '.....RD.....',
  ],
  fire: [
    '....O.......',
    '...OO..O....',
    '...OOO.OO...',
    '..OOOOOOO...',
    '..OOEEOOOO..',
    '.OOEEEEOOO..',
    '.OOEEYYEOO..',
    '.OOEYYYYOO..',
    '..OOEYYEOO..',
    '...OOOOOO...',
  ],
  star: [
    '.....Y.....',
    '.....Y.....',
    '....YYY....',
    'YYYYYYYYYYY',
    '.YYYYYYYYY.',
    '..YYYYYYY..',
    '..YYY.YYY..',
    '.YYY...YYY.',
  ],
  shield: [
    '.VVVVVVVVV.',
    'VUUUUVUUUUV',
    'VUUUUVUUUUV',
    'VVVVVVVVVVV',
    'VUUUUVUUUUV',
    '.VUUUVUUUV.',
    '..VUUVUUV..',
    '...VUVUV...',
    '....VVV....',
  ],
  bolt: [
    '....YYYY',
    '...YYYY.',
    '..YYYY..',
    '.YYYYYY.',
    '...YYYY.',
    '..YYY...',
    '..YY....',
    '.Y......',
  ],
  cube: [
    'NNNNNNNNNNNN',
    'NMNNNNNMNNNN',
    'MNNNMNNNNNMN',
    'TTTTTTTTTTTT',
    'TTHTTTTHTTTT',
    'TTTTTTTTTTHT',
    'THTTTTTTTTTT',
    'TTTTTHTTTHTT',
    'TTTTTTTTTTTT',
  ],
  check: [
    '.........NN',
    '........NNM',
    '.......NNM.',
    'N.....NNM..',
    'NN...NNM...',
    '.NN.NNM....',
    '..NNNM.....',
    '...NM......',
  ],
};

export const EMOJI_NAMES = Object.keys(ART);

/* system emoji -> custom emoji */
const MAP = {
  '🎁': 'gift', '💎': 'diamond', '⛏': 'pickaxe', '⚔': 'sword', '🗡': 'sword', '❤': 'heart', '💖': 'heart', '🔥': 'fire',
  '⭐': 'star', '🌟': 'star', '✨': 'star', '🛡': 'shield', '⚡': 'bolt', '✅': 'check', '✔': 'check', '🎉': 'gift', '🧱': 'cube', '🟩': 'cube',
};

export default function Emoji({ name, size = 18, className = '', title }) {
  const rows = ART[name] || ART.star;
  const w = Math.max(...rows.map((r) => r.length));
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.') { x += 1; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === c) run += 1;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={P[c]} />);
      x += run;
    }
  });
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} width={size} height={(size * rows.length) / w} shapeRendering="crispEdges"
      className={`emoji inline-block shrink-0 align-[-0.15em] ${className}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects}
    </svg>
  );
}

const TOKEN = /:([a-z]+):|(\p{Extended_Pictographic}\uFE0F?)/gu;

/* Renders text, swapping :name: tokens and system emoji for custom emoji. */
export function Rich({ text, size = 16 }) {
  if (text == null) return null;
  const str = String(text);
  const out = [];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    const name = m[1] ? m[1] : MAP[m[2].replace('\uFE0F', '')];
    if (name && ART[name]) out.push(<Emoji key={`${m.index}`} name={name} size={size} />);
    else if (m[1]) out.push(m[0]); // unknown :token: stays as typed
    // unknown system emoji are dropped
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push(str.slice(last));
  return <>{out}</>;
}
