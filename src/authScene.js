// Góc phố cà phê Việt Nam lúc nắng sớm: nhà ống, dây điện, cờ, đèn lồng, xe máy, vỉa hè và vạch kẻ đường.
// Mỗi phần tử là 1 lớp parallax: d = độ sâu (càng lớn càng di chuyển nhiều). Màu lấy từ biến CSS --s-* / --b* trong auth.css.
// Khung vẽ rộng hơn (x -100..700) để trên điện thoại/tablet (tỉ lệ khung cố định 16:10) cảnh luôn đủ và ổn định.
const svg = inner => `<svg viewBox="-100 0 800 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${inner}</svg>`;
const bez = (p, t) => { const u = 1 - t; return [0, 1].map(i => u ** 3 * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t ** 3 * p[3][i]); };
const BASE = 440; // mặt đường chân nhà

// Dãy nhà cao tầng mờ phía xa
const far = svg([[-90, 64, 260], [-26, 56, 300], [30, 70, 250], [100, 50, 310], [150, 62, 270], [212, 58, 320], [270, 66, 280], [336, 54, 305], [390, 70, 262], [460, 60, 300], [520, 56, 270], [576, 70, 310], [646, 60, 255]]
  .map(([x, w, t]) => `<rect x="${x}" y="${t}" width="${w}" height="${BASE - t}" class="s-far"/>` + Array.from({ length: Math.floor((BASE - t) / 28) }, (_, i) => `<path d="M${x} ${t + 14 + i * 28}h${w}" class="s-tile"/>`).join('')).join(''));

// Một căn nhà ống: tường, mái, cửa sổ, ban công, máy lạnh, cửa cuốn, biển hiệu
const house = (x, w, top, c, roof, opt = '') => {
  let s = `<g class="hs"><rect x="${x}" y="${top}" width="${w}" height="${BASE - top}" class="${c}"/>`;
  let hz = `<rect x="${x}" y="${top}" width="${w}" height="${BASE - top}" class="s-haze"/>`; // lớp sương chỉ phủ đúng hình căn nhà
  if (roof === 'tile') { const d = `M${x - 5} ${top}L${x + w / 2} ${top - 26}L${x + w + 5} ${top}Z`; s += `<path d="${d}" class="rt"/>`; hz += `<path d="${d}" class="s-haze"/>`; }
  else if (roof === 'tin') { const d = `M${x - 4} ${top}V${top - 8}L${x + w + 4} ${top - 16}V${top}Z`; s += `<path d="${d}" class="rn"/>`; hz += `<path d="${d}" class="s-haze"/>`; }
  else { s += `<rect x="${x - 3}" y="${top - 8}" width="${w + 6}" height="8" class="rb"/>`; hz += `<rect x="${x - 3}" y="${top - 8}" width="${w + 6}" height="8" class="s-haze"/>`; }
  if (opt.includes('tank')) { s += `<rect x="${x + w * .5}" y="${top - 42}" width="22" height="32" rx="7" class="tk"/><path d="M${x + w * .5 + 3} ${top - 24}h16" class="wl2"/>`; hz += `<rect x="${x + w * .5}" y="${top - 42}" width="22" height="32" rx="7" class="s-haze"/>`; }
  const n = Math.floor((BASE - top - 74) / 56);
  for (let i = 0; i < n; i++) {
    const y = top + 10 + i * 56, cnt = w > 90 ? 2 : 1, ww = cnt === 2 ? 22 : 30;
    for (let k = 0; k < cnt; k++) { const wx = x + (w / cnt) * (k + .5) - ww / 2; s += `<rect x="${wx}" y="${y + 4}" width="${ww}" height="30" rx="${(i + k) % 2 ? 11 : 2}" class="wn"/><path d="M${wx + ww / 2} ${y + 4}v30M${wx} ${y + 19}h${ww}" class="wl2"/>`; }
    if (i % 2 === 0) { let r = `M${x + 3} ${y + 40}h${w - 6}`; for (let bx = x + 8; bx < x + w - 4; bx += 9) r += `M${bx} ${y + 40}v11`; s += `<path d="${r}" class="wl2"/>`; }
    else if (w > 80) s += `<rect x="${x + w - 24}" y="${y + 38}" width="18" height="12" rx="2" class="ac"/>`;
  }
  if (opt.includes('cafe')) {
    s += `<rect x="${x + 10}" y="${BASE - 60}" width="${w - 20}" height="60" class="in"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${x + 6 + i * (w - 12) / 6}" y="${BASE - 66}" width="${(w - 12) / 6}" height="14" class="${i % 2 ? 'aw2' : 'aw1'}"/>`;
    s += `<rect x="${x + 14}" y="${BASE - 94}" width="${w - 28}" height="22" class="sn"/><text x="${x + w / 2}" y="${BASE - 78}" class="stx">CÀ PHÊ</text>`;
  } else {
    let sh = `M${x + 8} ${BASE - 62}`; s += `<rect x="${x + 8}" y="${BASE - 62}" width="${w - 16}" height="62" class="sd"/>`;
    for (let yy = BASE - 54; yy < BASE; yy += 9) sh += `M${x + 8} ${yy}h${w - 16}`;
    s += `<path d="${sh}" class="wl2"/><rect x="${x + 8}" y="${BASE - 80}" width="${w - 16}" height="14" class="${opt.includes('sign2') ? 'aw1' : 'sn'}"/>`;
  }
  return s + '</g>' + hz;
};
const houses = svg([[-100, 92, 210, 'b3', 'tile', ''], [-8, 86, 160, 'b1', 'flat', 'tank'], [78, 96, 230, 'b2', 'tin', 'sign2'], [174, 84, 190, 'b4', 'flat', ''], [258, 104, 150, 'b5', 'tile', ''], [362, 88, 220, 'b6', 'flat', 'tank'], [450, 96, 170, 'b1', 'tile', 'cafe'], [546, 92, 200, 'b2', 'flat', 'sign2'], [638, 90, 185, 'b3', 'tile', '']]
  .map(a => house(...a)).join(''));

const star = (cx, cy, r) => { let p = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .4 : r; p += `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)} `; } return `<polygon points="${p}" class="star"/>`; };
// Cờ đỏ sao vàng + đèn lồng đỏ treo ban công
const deco = svg(`<g class="hs"><path d="M458 300L510 268" class="s-wire" stroke-width="3"/><g class="au-flag"><path d="M500 272l46-4v30l-46 4z" class="flag"/>${star(523, 285, 8)}</g>
${[108, 128, 148].map((x, i) => `<g class="au-lan" style="animation-delay:${-i * .8}s"><path d="M${x} 286V296" class="wl2"/><ellipse cx="${x}" cy="305" rx="8" ry="10" class="lan"/><path d="M${x} 315v8" class="wl2"/></g>`).join('')}</g>`);

// Cột điện + dây điện chằng chịt
const wires = (() => {
  let s = '';
  [[36, 1], [566, -1]].forEach(([x, d]) => {
    s += `<g class="hs"><rect x="${x - 5}" y="226" width="10" height="${BASE - 226}" class="pl"/><rect x="${x - 24}" y="240" width="48" height="6" class="pl"/><rect x="${x - 18}" y="258" width="36" height="5" class="pl"/><rect x="${x + d * 12}" y="300" width="22" height="30" rx="4" class="tf"/></g>`;
  });
  for (let k = 0; k < 6; k++) { const y0 = 243 + (k % 3) * 8, sag = 30 + k * 12; s += `<path d="M36 ${y0}Q300 ${y0 + sag * 2} 566 ${y0 + (k % 2) * 4}" class="s-wire"/>`; }
  [[-100, 270, 36, 244], [-100, 300, 36, 262], [566, 244, 700, 286], [566, 262, 700, 306]].forEach(([a, b, c, d]) => (s += `<path d="M${a} ${b}Q${(a + c) / 2} ${Math.max(b, d) + 26} ${c} ${d}" class="s-wire"/>`));
  s += '<path d="M36 252Q120 330 250 290M566 252Q480 320 372 292" class="s-wire"/>';
  return svg(s);
})();

// Dây đèn bóng tròn treo giữa hai cột điện (đặt sau ghế)
const garland = (() => {
  const P = [[36, 250], [150, 352], [450, 352], [566, 250]];
  let s = `<path d="M36 250C150 352 450 352 566 250" class="s-wire"/>`;
  for (let i = 1; i < 10; i++) { const [x, y] = bez(P, i / 10); s += `<path d="M${x} ${y}v8" class="s-wire"/><circle cx="${x}" cy="${y + 15}" r="7" class="au-bulb" style="animation-delay:${-i * 0.6}s"/>`; }
  return svg(s);
})();

// Vỉa hè lát gạch, bó vỉa sơn đen trắng, mặt đường nhựa + vạch kẻ đường (vạch biên, vạch đứt, vạch người đi bộ)
const ground = (() => {
  let s = `<rect x="-100" y="${BASE}" width="800" height="105" class="s-walk"/>`;
  for (let r = 0; r < 3; r++) { const y = BASE + r * 35; s += `<path d="M-100 ${y}H700" class="s-tile"/>`; for (let x = -100 + (r % 2) * 30; x < 700; x += 60) s += `<path d="M${x} ${y}v35" class="s-tile"/>`; }
  for (let x = -100, i = 0; x < 700; x += 26, i++) s += `<rect x="${x}" y="545" width="26" height="12" class="${i % 2 ? 'kb2' : 'kb1'}"/>`;
  s += `<rect x="-100" y="557" width="800" height="143" class="s-road"/><rect x="-100" y="566" width="800" height="3" class="s-line"/>`;
  for (let x = -100; x < 410; x += 66) s += `<rect x="${x}" y="606" width="38" height="5" rx="1" class="s-line"/>`;
  for (let i = 0; i < 7; i++) s += `<path d="M${440 + i * 24} 574h14l-12 62h-14z" class="s-line"/>`;
  [[360, 528], [488, 518]].forEach(([cx, cy]) => { for (let i = 0; i < 10; i++) s += `<path d="M${cx + i * 11 - 70} ${cy + (i % 3) * 5}l-9 7" class="s-hatch"/>`; });
  return svg(s);
})();

// Xe Honda Dream (xe số "cub" đời cũ): bánh căm to, yên đen dài, thân đỏ đô có sọc, yếm trắng, đèn pha tròn, pô và gác-ba-ga chrome
const tube = (d, w, cls = 'tbs') => `<path d="${d}" stroke-width="${w + 3}" class="tbi"/><path d="${d}" stroke-width="${w}" class="${cls}"/>`;
const wheel = (cx, cy) => {
  let sp = '';
  for (let a = 0; a < 180; a += 20) { const r = a * Math.PI / 180; sp += `M${(cx - 30 * Math.cos(r)).toFixed(1)} ${(cy - 30 * Math.sin(r)).toFixed(1)}L${(cx + 30 * Math.cos(r)).toFixed(1)} ${(cy + 30 * Math.sin(r)).toFixed(1)}`; }
  return `<circle cx="${cx}" cy="${cy}" r="35" class="wl" style="stroke-width:9"/><circle cx="${cx}" cy="${cy}" r="30" class="rim"/><path d="${sp}" class="sp"/><circle cx="${cx}" cy="${cy}" r="11" class="mt"/><circle cx="${cx}" cy="${cy}" r="4" class="wh"/>`;
};
// Xe ngắn lại (cơ sở bánh 131) và đặt lùi ra phía sau vỉa hè
const scooter = svg(`<g class="hs" transform="translate(50 401) scale(.84)"><ellipse cx="112" cy="132" rx="122" ry="8" class="shd2"/>
${wheel(44, 90)}<g transform="translate(-30 0)">${wheel(205, 90)}</g>
${tube('M8 98C4 62 30 44 66 52', 6)}<rect x="0" y="62" width="12" height="11" rx="3" class="tl"/>${tube('M62 50L26 38L8 46', 5)}
${tube('M92 104L50 98', 5)}
<path d="M66 56H138L150 68L138 86H118L100 98H80C70 98 66 88 66 76Z" class="sc1"/><path d="M76 76H132" class="dc1"/><path d="M76 76H132" class="dc2"/>
<path d="M84 92H150V112H92C84 112 80 104 84 92Z" class="mt"/><circle cx="118" cy="102" r="11" class="mt"/><circle cx="118" cy="102" r="4" class="mt"/><path d="M130 88L160 76L168 90L140 102Z" class="mt"/>
<path d="M152 118L58 121L40 114L58 108L152 110Z" class="mt"/><path d="M62 114H130" class="wl2"/>${tube('M80 70L62 94', 5, 'tbm')}
<path d="M28 52C28 42 42 40 58 40H128L142 46C142 56 132 58 122 58H40Z" class="sc2"/>
<g transform="translate(-30 0)">${tube('M200 40L205 90', 7)}
<path d="M188 32C204 26 212 36 210 52L204 92C202 100 194 104 186 102C164 98 152 84 150 70C168 70 178 52 182 38Z" class="sc3"/>
${tube('M165 96C166 30 246 30 250 96', 6)}
${tube('M200 36L188 20H172', 4, 'tbm')}${tube('M188 20L184 6', 2, 'tbm')}<ellipse cx="184" cy="4" rx="7" ry="4" class="sc1"/>
<circle cx="218" cy="38" r="15" class="sc3"/><circle cx="218" cy="38" r="10" class="lamp"/></g></g>`);

// Bầu trời: mặt trời (theme sáng), mặt trăng + sao (theme tối), mây trôi
const cloud = (x, y, k, dl) => `<g class="s-cloud" style="animation-delay:${dl}s"><g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="0" rx="40" ry="12"/><ellipse cx="-18" cy="-8" rx="20" ry="12"/><ellipse cx="8" cy="-14" rx="24" ry="14"/><ellipse cx="28" cy="-4" rx="18" ry="10"/></g></g>`;
const sky = svg(`<g class="s-sun au-pulse"><circle cx="125" cy="168" r="58" opacity=".18"/><circle cx="125" cy="168" r="42" opacity=".32"/><circle cx="125" cy="168" r="28" class="sun-core"/></g>
<g class="s-moon"><circle cx="125" cy="168" r="50" class="moon-glow"/><circle cx="125" cy="168" r="26" class="moon-core"/><circle cx="116" cy="160" r="5" class="moon-cr"/><circle cx="134" cy="174" r="7" class="moon-cr"/><circle cx="122" cy="181" r="3" class="moon-cr"/></g>
${[[40, 80], [210, 62], [300, 110], [380, 70], [470, 96], [540, 60], [590, 120], [70, 140], [250, 150]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.7" class="s-star" style="animation-delay:${-i * .8}s"/>`).join('')}
${cloud(60, 128, 1.2, 0)}${cloud(330, 110, 1.4, -9)}${cloud(520, 152, 1, -18)}${cloud(220, 160, .8, -5)}`);

// Chiếc ghế nhựa Sài Gòn; items = đồ đặt lên mặt ghế (toạ độ gốc ở góc trái mặt ghế)
const stool = (cls, items = '') => `<g class="stool ${cls}"><ellipse cx="76" cy="122" rx="96" ry="9" class="shd"/>
<path d="M34 44L28 98H44L50 44ZM104 44L110 98H126L120 44Z" class="sl dk"/><path d="M4 44L-8 118H12L24 44ZM128 44L140 118H160L148 44Z" class="sl"/><path d="M12 94H142V103H12Z" class="sl dk"/>
<path d="M-2 26H152V46H-2Z" class="sf"/><rect x="14" y="31" width="30" height="9" rx="4" class="sh"/><rect x="61" y="31" width="30" height="9" rx="4" class="sh"/><rect x="108" y="31" width="30" height="9" rx="4" class="sh"/>
<path d="M22 0H130L152 26H-2Z" class="stp"/><path d="M58 0L49 26M94 0L101 26M14 9H138M5 18H145" class="sg"/>${items}</g>`;

const phin = `<path d="M52 -46H88L85 8H55Z" class="gl"/><path d="M54 -18H86L85 8H55Z" class="cf"/><path d="M44 -50H96V-45H44Z" class="mt"/><path d="M52 -88H88V-50H52Z" class="mt"/><path d="M52 -70H88" class="sg"/>
<path d="M56 -98H84V-88H56Z" class="mt"/><path d="M66 -106H74V-98H66Z" class="mt"/>
<path d="M104 -62H142L138 8H108Z" class="gl"/><path d="M105 -30H141L138 8H108Z" class="cf"/><rect x="110" y="-32" width="11" height="11" rx="2" class="ic" transform="rotate(12 115 -26)"/><rect x="124" y="-20" width="11" height="11" rx="2" class="ic" transform="rotate(-10 129 -14)"/><path d="M124 -72L134 -28" class="sg"/>
<path class="au-steam" d="M64 -114c-8-8 8-14 0-26M78 -114c-8-8 8-16 0-28" fill="none" stroke-width="4" stroke-linecap="round"/>`;
const cat = `<ellipse cx="76" cy="-2" rx="36" ry="19" class="cat"/><circle cx="108" cy="-12" r="14" class="cat"/><path d="M97 -23L100 -37L108 -26ZM109 -26L116 -36L120 -21Z" class="cat"/><path d="M42 6C24 12 20 -4 32 -8" class="cat" fill="none" stroke-width="7" stroke-linecap="round"/><path d="M101 -12q3 3 6 0M111 -12q3 3 6 0" class="sg"/>`;

const mote = (x, y, t, dl) => `<i class="au-mote" style="left:${x}%;top:${y}%;--t:${t}s;--dl:${dl}s"></i>`;

export const SCENE = [
  { d: 3, html: sky },
  { d: 5, html: far },
  { d: 12, html: houses },
  { d: 14, html: deco },
  { d: 18, html: garland },
  { d: 21, html: wires },
  { d: 26, html: ground },
  { d: 32, html: scooter },
  { d: 46, html: svg(`<g transform="translate(420 412) scale(.7)">${stool('yel', cat)}</g>`) },
  { d: 54, html: svg(`<g transform="translate(276 408) scale(.9)">${stool('red', phin)}</g>`) },
  { d: 62, html: mote(30, 52, 7, 0) + mote(48, 40, 9, -3) + mote(62, 60, 8, -5) + mote(22, 70, 10, -2) + mote(74, 48, 7, -4) },
];

export const CAPTIONS = [
  'Mỗi ngày một ly cà phê, một kế hoạch rõ ràng.',
  'Thu chi gọn gàng, ví nhẹ lòng.',
  'Mục tiêu nhỏ mỗi ngày, bước xa mỗi tháng.',
];
