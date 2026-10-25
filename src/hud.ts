import type { World } from './data/worlds';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as T;
}

export class Hud {
  private sysName = el('sys-name');
  private sysRegion = el('sys-region');
  private speed = el('speed');
  private throttle = el<HTMLDivElement>('throttle-fill');
  private dist = el('dist');
  private fuel = el<HTMLDivElement>('fuel-fill');
  private fuelText = el('fuel-text');
  private credits = el('credits');
  private date = el('date');
  private marker = el('target-marker');
  private markerLabel = el('target-label');
  private status = el('status');
  private message = el('message');
  private info = el('info');
  private mapPanel = el('map-panel');
  private mapTarget = el('map-target');
  private mapHint = el('map-hint');
  private jumpBtn = el<HTMLButtonElement>('jump-btn');
  private help = el('help');
  private objective = el('objective');
  private strainRow = el('strain-row');
  private strainFill = el<HTMLDivElement>('strain-fill');
  private journal = el('journal');
  private journalBody = el('journal-body');
  private contracts = el('contracts');
  private msgTimer = 0;

  constructor() {}

  setSystem(w: World): void {
    this.sysName.textContent = w.name.toUpperCase();
    this.sysRegion.textContent = `${w.region} · ${w.starName}`;
  }

  setFlight(speed: number, throttle: number, boost: boolean, distKm: number, fuel: number, fuelCap: number, credits: number, dateText: string): void {
    this.speed.textContent = `${Math.round(speed).toString().padStart(4, ' ')} ${boost ? 'BOOST' : 'km/s'}`;
    this.throttle.style.width = `${Math.round(throttle * 100)}%`;
    this.throttle.classList.toggle('boost', boost);
    this.dist.textContent = distKm >= 10000 ? `${(distKm / 1000).toFixed(1)}k km` : `${Math.round(distKm)} km`;
    this.fuel.style.width = `${(fuel / fuelCap) * 100}%`;
    this.fuelText.textContent = `${fuel.toFixed(1)} / ${fuelCap}`;
    this.credits.textContent = `${credits.toLocaleString()} cr`;
    this.date.textContent = dateText;
  }

  setMarker(x: number, y: number, visible: boolean, offscreen: boolean, angle: number, label: string): void {
    this.marker.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    this.marker.style.left = `${x}px`;
    this.marker.style.top = `${y}px`;
    this.marker.classList.toggle('offscreen', offscreen);
    this.marker.style.setProperty('--angle', `${angle}rad`);
    this.markerLabel.textContent = label;
  }

  private promptEl = document.getElementById('prompt')!;
  setPrompt(text: string): void { if (this.promptEl.textContent !== text) this.promptEl.textContent = text; this.promptEl.classList.toggle('show', !!text); }

  setStatus(text: string, cls = ''): void {
    this.status.textContent = text;
    this.status.className = `status ${cls}`;
  }

  showMessage(text: string, ms = 2600): void {
    this.message.textContent = text;
    this.message.classList.add('show');
    clearTimeout(this.msgTimer);
    this.msgTimer = window.setTimeout(() => this.message.classList.remove('show'), ms);
  }

  showInfo(w: World): void {
    this.info.innerHTML = `
      <div class="info-kicker">${w.region}</div>
      <h2>${w.name}</h2>
      <div class="info-grid">
        <span>Type</span><span>${w.type}</span>
        <span>Star</span><span>${w.starName}</span>
        <span>Population</span><span>${w.population}</span>
      </div>
      <p>${w.lore}</p>
      <div class="info-foot">Press I to close</div>`;
    this.info.classList.add('show');
  }

  hideInfo(): void { this.info.classList.remove('show'); }
  get infoOpen(): boolean { return this.info.classList.contains('show'); }

  showMap(show: boolean): void {
    this.mapPanel.classList.toggle('show', show);
    document.body.classList.toggle('map-open', show);
  }

  setMapTarget(current: World, target: World | null, route: World[], hopDist: number, fuel: number): void {
    if (!target) {
      this.mapTarget.innerHTML = `<div class="info-kicker">Current system</div><h2>${current.name}</h2><p>${current.region}</p>`;
      this.mapHint.textContent = 'Click a star to select a destination. Drag to orbit. Scroll to zoom. Far stars route through several jumps.';
      this.jumpBtn.disabled = true;
      this.jumpBtn.textContent = 'SELECT A DESTINATION';
      return;
    }
    const reachable = route.length > 0;
    const fuelOk = fuel >= hopDist;
    const next = route[0];
    const total = route.reduce((acc, w, i) => acc + (i === 0 ? hopDist : 0) + (i > 0 ? Math.hypot(w.pos[0] - route[i - 1].pos[0], w.pos[1] - route[i - 1].pos[1], w.pos[2] - route[i - 1].pos[2]) : 0), 0);
    this.mapTarget.innerHTML = `
      <div class="info-kicker">${target.region}</div>
      <h2>${target.name}</h2>
      <div class="info-grid">
        <span>Route</span><span>${reachable ? `${route.length} jump${route.length > 1 ? 's' : ''} · ${(total * 500).toFixed(0)} ly` : 'no route'}</span>
        <span>Next hop</span><span>${reachable ? `${next.name} · ${hopDist.toFixed(1)} fuel` : '—'}</span>
        <span>Star</span><span>${target.starName}</span>
      </div>
      <p>${target.lore}</p>`;
    this.jumpBtn.disabled = !(reachable && fuelOk);
    this.jumpBtn.textContent = !reachable ? 'NO ROUTE' : !fuelOk ? 'NOT ENOUGH FUEL' : route.length > 1 ? `JUMP TO ${next.name.toUpperCase()} · 1 OF ${route.length}  [J]` : `JUMP TO ${target.name.toUpperCase()}  [J]`;
    this.mapHint.textContent = reachable ? 'Press J or click JUMP to enter hyperspace. The route continues after each arrival.' : 'No charted route reaches this star.';
  }

  setObjective(text: string): void {
    this.objective.textContent = text;
    this.objective.style.display = text ? 'block' : 'none';
  }

  setStrain(value: number, show: boolean): void {
    this.strainRow.style.display = show ? 'flex' : 'none';
    this.strainFill.style.width = `${Math.min(100, value * 20)}%`;
    this.strainFill.classList.toggle('hot', value >= 3);
  }

  showJournal(entries: string[], crew: string[], objective: string): void {
    const items = entries.length ? entries.map((e) => `<li>${e}</li>`).reverse().join('') : '<li class="dim">No entries yet.</li>';
    this.journalBody.innerHTML = `
      <div class="info-kicker">Objective</div><p>${objective || '—'}</p>
      <div class="info-kicker">Crew of the Kestrel</div><p>R. Taren Vesk (pilot)${crew.map((c) => `, ${c}`).join('')}</p>
      <div class="info-kicker">Log</div><ul>${items}</ul>`;
    this.journal.classList.add('show');
  }
  hideJournal(): void { this.journal.classList.remove('show'); }
  get journalOpen(): boolean { return this.journal.classList.contains('show'); }

  onJump(cb: () => void): void { this.jumpBtn.addEventListener('click', cb); }

  /** Renders the contracts board in the map panel. */
  setContracts(items: { id: string; title: string; world: string; summary: string; reward: string; status: 'open' | 'active' | 'done' }[], onAccept: (id: string) => void): void {
    if (!items.length) { this.contracts.innerHTML = ''; return; }
    this.contracts.innerHTML = `<div class="info-kicker">Contracts</div>` + items.map((c) => `
      <div class="contract ${c.status}">
        <div class="contract-head"><span class="contract-title">${c.title}</span><span class="contract-world">${c.world}</span></div>
        <p>${c.summary}</p>
        <div class="contract-foot"><span class="contract-reward">${c.reward}</span>${c.status === 'open' ? `<button data-id="${c.id}" class="contract-btn">ACCEPT</button>` : `<span class="contract-status">${c.status === 'active' ? 'ACTIVE' : 'COMPLETE'}</span>`}</div>
      </div>`).join('');
    this.contracts.querySelectorAll<HTMLButtonElement>('.contract-btn').forEach((b) => b.addEventListener('click', () => onAccept(b.dataset.id!)));
  }

  toggleHelp(): void { this.help.classList.toggle('show'); }
  hideHelp(): void { this.help.classList.remove('show'); }
}
