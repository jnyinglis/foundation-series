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

  setMapTarget(current: World, target: World | null, dist: number, inRange: boolean, fuel: number): void {
    if (!target) {
      this.mapTarget.innerHTML = `<div class="info-kicker">Current system</div><h2>${current.name}</h2><p>${current.region}</p>`;
      this.mapHint.textContent = 'Click a star to select a destination. Drag to orbit. Scroll to zoom.';
      this.jumpBtn.disabled = true;
      this.jumpBtn.textContent = 'SELECT A DESTINATION';
      return;
    }
    const fuelOk = fuel >= dist;
    this.mapTarget.innerHTML = `
      <div class="info-kicker">${target.region}</div>
      <h2>${target.name}</h2>
      <div class="info-grid">
        <span>Distance</span><span>${(dist * 500).toFixed(0)} ly</span>
        <span>Fuel</span><span>${dist.toFixed(1)} units</span>
        <span>Star</span><span>${target.starName}</span>
      </div>
      <p>${target.lore}</p>`;
    this.jumpBtn.disabled = !(inRange && fuelOk);
    this.jumpBtn.textContent = !inRange ? 'OUT OF JUMP RANGE' : !fuelOk ? 'NOT ENOUGH FUEL' : `JUMP TO ${target.name.toUpperCase()}  [J]`;
    this.mapHint.textContent = inRange ? 'Press J or click JUMP to enter hyperspace.' : 'Plot a chain of shorter jumps. The ring shows your range.';
  }

  onJump(cb: () => void): void { this.jumpBtn.addEventListener('click', cb); }

  toggleHelp(): void { this.help.classList.toggle('show'); }
  hideHelp(): void { this.help.classList.remove('show'); }
}
