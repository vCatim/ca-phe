import React, { useState, useEffect, useRef } from 'react';
import { TaskRow } from '../components/ui/TaskRow';
import { DatePicker } from '../components/modals/DatePicker';
import { CC, DAYS, WD } from '../constants';
import { today, pad, addDays, wkStart, dBetween, addMonths, toMin } from '../utils/format';

export function Calendar({ db, openTask, toggle, delTask, clip, setClip, pasteClip, importIcs, openGoogleSync, openNotification }) {
  const [sel, setSel] = useState(today());
  const [col, setCol] = useState(0);
  const [dir, setDir] = useState('n');
  const [ys, setYs] = useState(false);
  const [drag, setDrag] = useState(null);
  const [noTr, setNoTr] = useState(false);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const sw = useRef(null);
  const clipRef = useRef(null);
  const wheelLock = useRef(false);
  const fileRef = useRef(null);
  const wkRef = useRef(null);
  const [pick, setPick] = useState(false);

  useEffect(() => {
    if (wkRef.current) wkRef.current.scrollTop = 6.5 * 48;
  }, [sel.slice(0, 8) + wkStart(sel)]); // mở ra thì cuộn tới khoảng 6:30 sáng

  const CH = 48;
  const ws = wkStart(sel);
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const HH = 48;
  const H0 = 0;
  const HR = 24; // lưới đủ 24 giờ (00:00–24:00)

  const isMob = () => !!window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const dayTasks = d => db.tasks.filter(x => x.date === d).sort((a, b) => a.start.localeCompare(b.start));
  const say = t => {
    setMsg(t);
    setTimeout(() => setMsg(''), 3000);
  };
  const W = () => (clipRef.current && clipRef.current.offsetWidth) || 320;

  // ----- lịch mobile: col = 0 (xem tháng) / 1 (xem tuần); kéo ngón tay thì dx/dy bám theo, thả tay thì trượt nốt hoặc trượt về -----
  const mc = d => {
    const st = wkStart(d.slice(0, 8) + '01');
    const n = new Date(+d.slice(0, 4), +d.slice(5, 7), 0).getDate();
    const r = Math.ceil((dBetween(st, d.slice(0, 8) + pad(n)) + 1) / 7);
    return { cells: [...Array(r * 7)].map((_, i) => addDays(st, i)), rows: r, st };
  };
  const wc = d => ({ cells: [...Array(7)].map((_, i) => addDays(wkStart(d), i)), rows: 1 });
  const rows = mc(sel).rows;
  const rng = Math.max((rows - 1) * CH, CH);
  const selRow = Math.floor(dBetween(mc(sel).st, sel) / 7);
  const dragging = !!drag && !drag.settle;
  const dragY = dragging && drag.axis === 'y';
  const dx = drag && drag.axis === 'x' ? drag.dx : 0;
  const colNow = Math.min(1, Math.max(0, col - (dragY ? drag.dy : 0) / rng)); // mức thu gọn hiện tại 0..1
  const useWeek = col === 1 && !dragY && !ys; // nghỉ ở chế độ tuần: dựng 3 hàng tuần; còn lại dựng lưới tháng rồi cắt bớt
  const trs = dragging || noTr ? 'none' : 'all .26s cubic-bezier(.2,.8,.2,1)';
  const panels = [-1, 0, 1].map(i =>
    useWeek ? { ...wc(addDays(sel, 7 * i)), m: addDays(sel, 7 * i) } : { ...mc(addMonths(sel, i)), m: addMonths(sel, i) }
  );

  let h = CH;
  if (!useWeek) {
    const base = rows * CH - colNow * (rows - 1) * CH;
    const nb = dx ? panels[dx < 0 ? 2 : 0].rows : rows;
    h = colNow === 0 && dx ? base + (nb - rows) * CH * Math.min(1, Math.abs(dx) / W()) : base;
  }

  const commit = dir => {
    if (drag && drag.settle) return;
    const wk = col === 1;
    setDrag({ axis: 'x', dx: -dir * W(), dy: 0, settle: true });
    setTimeout(() => {
      setNoTr(true);
      setSel(c => (wk ? addDays(c, 7 * dir) : addMonths(c, dir)));
      setDrag(null);
      setTimeout(() => setNoTr(false), 60);
    }, 270);
  };

  const settleCol = (t, two) => {
    setYs(true);
    if (two) requestAnimationFrame(() => requestAnimationFrame(() => setCol(t)));
    else setCol(t);
    setTimeout(() => setYs(false), 320);
  };

  const jump = ns => {
    setDir(ns > sel ? 'n' : 'p');
    setSel(ns);
  };

  const go = n => (isMob() ? commit(n) : jump(addDays(sel, 7 * n)));

  useEffect(() => {
    // máy tính: phím ← → đổi tuần
    const h = e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector('.ov')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const down = e => {
    if (drag && drag.settle) return;
    sw.current = { x: e.clientX, y: e.clientY, t: Date.now(), axis: null };
  };

  const move = e => {
    const k = sw.current;
    if (!k) return;
    const mx = e.clientX - k.x;
    const my = e.clientY - k.y;
    if (!k.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      k.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
    setDrag({ axis: k.axis, dx: k.axis === 'x' ? mx : 0, dy: k.axis === 'y' ? my : 0 });
  };

  const up = e => {
    const k = sw.current;
    sw.current = null;
    if (!k || !k.axis) return;
    const mx = e.clientX - k.x;
    const my = e.clientY - k.y;
    const v = Math.abs(k.axis === 'x' ? mx : my) / Math.max(1, Date.now() - k.t);
    if (k.axis === 'x') {
      if (Math.abs(mx) > W() * 0.25 || (v > 0.5 && Math.abs(mx) > 30)) commit(mx < 0 ? 1 : -1);
      else setDrag(null);
    } else {
      const cn = Math.min(1, Math.max(0, col - my / rng));
      const t = v > 0.4 && Math.abs(my) > 25 ? (my < 0 ? 1 : 0) : cn > 0.5 ? 1 : 0;
      setDrag(null);
      settleCol(t);
    }
  };

  const list = dayTasks(sel);
  const add = () => {
    openTask({ date: sel, title: q.trim() });
    setQ('');
  };

  const handleIcs = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importIcs(file);
      say(
        result.added
          ? `Đã nhập ${result.added} sự kiện${result.skipped ? `, bỏ qua ${result.skipped} sự kiện trùng` : ''}.`
          : 'Không có sự kiện mới để nhập.'
      );
    } catch (error) {
      say(error.message || 'Không đọc được file .ics.');
    }

    e.target.value = '';
  };

  const cell = (d, out) => (
    <button key={d} className={'cell ' + (d === sel ? 'sel ' : '') + (out ? 'out' : '')} onClick={() => setSel(d)}>
      <span className={'dn ' + (d === today() ? 'now' : '')}>{+d.slice(8)}</span>
      <span className="bars">
        {dayTasks(d)
          .slice(0, 3)
          .map(x => (
            <i
              key={x.id}
              style={{
                background: x.pri === 'Cao' ? 'var(--warn)' : CC[x.cat],
                opacity: x.status === 'done' ? 0.4 : 1
              }}
            />
          ))}
      </span>
    </button>
  );

  return (
    <div className="page">
      <div className="row between wrap">
        <h2 className="ttl" onClick={() => setPick(true)} title="Bấm để chọn ngày/tháng">
          Tháng {+sel.slice(5, 7)}, {sel.slice(0, 4)} ▾
        </h2>
        <div className="row gap">
          <button className="btn sm out" onClick={() => go(-1)} aria-label="Trước">←</button>
          <button className="btn sm out" onClick={() => jump(today())}>Hôm nay</button>
          <button className="btn sm out" onClick={() => go(1)} aria-label="Sau">→</button>
          <button className="btn sm desk" onClick={() => openTask({ date: sel })}>+ Thêm việc</button>
        </div>
      </div>
      <p className="mut s desk">{days[0].split('-').reverse().join('/')} – {days[6].split('-').reverse().join('/')}</p>
      <div className="row gap wrap">
        <button className="btn sm out" onClick={() => fileRef.current?.click()}>📥 Nhập lịch .ics</button>
        <button className="btn sm out" onClick={openGoogleSync} title="Đồng bộ 2 chiều với Google Calendar và Google Tasks">🔄 Google Sync</button>
        <button className="btn sm out" onClick={openNotification} title="Cài đặt thông báo nhắc lịch">🔔 Nhắc việc</button>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={handleIcs}
          style={{ display: 'none' }}
        />
        {msg && <span className="s" style={{ color: 'var(--ok)' }}>{msg}</span>}
      </div>

      {/* Desktop: lưới tuần */}
      <div
        className="card wk desk"
        onWheel={e => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20 && !wheelLock.current) {
            wheelLock.current = true;
            go(e.deltaX > 0 ? 1 : -1);
            setTimeout(() => {
              wheelLock.current = false;
            }, 500);
          }
        }}
      >
        <div className={'wkanim ' + (dir === 'n' ? 'wn' : 'wp')} key={ws}>
          <div className="wkh">
            <i />
            {days.map((d, i) => (
              <div key={d} className={(d === today() ? 'tdy ' : '') + (d === sel ? 'selh' : '')} onClick={() => setSel(d)}>
                {DAYS[i]} <b>{d.slice(8)}</b>
              </div>
            ))}
          </div>
          <div className="wkscroll" ref={wkRef}>
            <div className="wkb" style={{ height: HR * HH }}>
              <div className="hrs">
                {[...Array(HR)].map((_, i) => (
                  <span key={i} style={{ height: HH }}>{i > 0 ? pad(H0 + i) + ':00' : ''}</span>
                ))}
              </div>
              {days.map(d => (
                <div key={d} className="dcol" style={{ backgroundSize: `100% ${HH}px` }}>
                  {dayTasks(d).map(x => {
                    const s0 = Math.max(toMin(x.start), H0 * 60);
                    const e0 = Math.min(toMin(x.end), (H0 + HR) * 60); // cắt phần nằm ngoài lưới
                    const top = ((s0 - H0 * 60) / 60) * HH;
                    const hh = Math.max(26, ((e0 - s0) / 60) * HH);
                    return (
                      <div
                        key={x.id}
                        className={'blk ' + (x.pri === 'Cao' ? 'hp ' : '') + (x.status === 'done' ? 'done' : '')}
                        style={{ top, height: hh, '--c': CC[x.cat] }}
                        onClick={() => openTask(x)}
                      >
                        <b>{x.title}</b>
                        <small>{x.start}–{x.end}</small>
                        <small>{x.note}</small>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: lịch tháng/tuần kéo theo ngón tay + danh sách theo ngày */}
      <div
        className="card calcard mob"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          sw.current = null;
          setDrag(null);
        }}
      >
        <div className="cgrid h">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
        <div className="clip" ref={clipRef} style={{ height: h, transition: trs }}>
          <div className="track" style={{ transform: `translateX(calc(-33.3333% + ${dx}px))`, transition: trs }}>
            {panels.map((p, i) => (
              <div
                key={(useWeek ? 'w' : 'm') + i}
                className="pan"
                style={{
                  transform: i === 1 && !useWeek ? `translateY(${-colNow * selRow * CH}px)` : 'none',
                  transition: trs
                }}
              >
                <div className="cgrid">
                  {p.cells.map(d => cell(d, !useWeek && d.slice(0, 7) !== p.m.slice(0, 7)))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="grab" onClick={() => settleCol(col === 1 ? 0 : 1, col === 1)} aria-label="Thu gọn hoặc mở rộng lịch" />
      </div>

      <div className="mob">
        <div className="row between">
          <b>{WD[new Date(sel + 'T00:00').getDay()]}, {sel.slice(8)}/{sel.slice(5, 7)}</b>
          <span className="mut s">{list.length} việc</span>
        </div>
        <div className="col gap dayl" key={sel} style={{ marginTop: 10 }}>
          {list.length ? (
            list.map(x => <TaskRow key={x.id} t={x} onToggle={toggle} onEdit={openTask} onDel={delTask} />)
          ) : (
            <div className="card empty">
              <p>Chưa có việc nào trong ngày này.</p>
              <button className="btn sm" onClick={() => openTask({ date: sel })}>+ Thêm việc</button>
            </div>
          )}
        </div>
        <div className="qa">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={`Thêm việc vào ${sel.slice(8)}/${sel.slice(5, 7)}`}
          />
          <button onClick={add} aria-label="Thêm việc">+</button>
        </div>
      </div>

      <div className="row gap wrap s mut">
        <span><i className="dot" style={{ background: CC['Học tập'] }} /> Học tập/Bài tập</span>
        <span><i className="dot" style={{ background: CC['Dự án'] }} /> Dự án</span>
        <span><i className="dot" style={{ background: CC['Cá nhân'] }} /> Cá nhân/Sức khỏe</span>
        <span><i className="dot" style={{ background: 'var(--warn)' }} /> Ưu tiên cao</span>
      </div>

      {pick && <DatePicker value={sel} tasks={db.tasks} onPick={d => { jump(d); setPick(false); }} onClose={() => setPick(false)} />}
    </div>
  );
}
