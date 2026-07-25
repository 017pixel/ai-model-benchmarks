export class LocalAI {
  constructor(state) {
    this.state = state;
    this.t = 0;
    this.phase = Math.random() * 10;
  }

  tick(dt) {
    this.t += dt;
    const s = this.state.data;
    const time = s.timeOfDay;
    const clock = time * 24;
    const sun = Math.max(0, Math.sin(((clock - 6) / 12) * Math.PI));
    const ai = s.ai;
    const compute = s.compute;

    const solarFactor = sun;
    const solar = +(ai.solarTotal * solarFactor * (0.85 + 0.15 * Math.sin(this.t * 0.3))).toFixed(2);

    let consumption = 0.9 + Math.max(0, (18.5 - clock)) * 0.02 + Math.max(0, (clock - 21)) * 0.03;
    consumption += 0.15 * (ai.serverLoad / 40);
    if (compute.enabled) consumption += compute.power;

    ai.solarPower = solar;
    ai.consumption = +consumption.toFixed(2);

    if (solar > consumption) {
      ai.battery = Math.min(100, ai.battery + (solar - consumption) * dt * 0.6);
    } else {
      ai.battery = Math.max(8, ai.battery - (consumption - solar) * dt * 0.4);
    }
    ai.battery = +ai.battery.toFixed(1);

    const targetLoad = 22 + solarFactor * 8 + (compute.enabled ? compute.share * 0.4 : 0);
    ai.serverLoad += (targetLoad - ai.serverLoad) * Math.min(1, dt * 0.5);
    ai.serverLoad = +ai.serverLoad.toFixed(0);

    ai.outdoorTemp = +(8 + 12 * solarFactor + Math.sin(this.t * 0.1) * 1.5).toFixed(1);
    const indoorTarget = 21.5 + (compute.enabled ? compute.share * 0.02 : 0);
    ai.indoorTemp += (indoorTarget - ai.indoorTemp) * Math.min(1, dt * 0.3);
    ai.indoorTemp = +ai.indoorTemp.toFixed(1);
    ai.humidity = +(42 + 8 * (1 - solarFactor) + Math.sin(this.t * 0.2) * 2).toFixed(0);
    ai.airQuality = Math.max(85, Math.min(99, 96 + Math.round(Math.sin(this.t * 0.15) * 3) - (compute.enabled ? compute.share * 0.03 : 0)));

    const surplus = solar - consumption + ai.battery / 100 * 2;
    ai.autonomy = Math.max(0, Math.min(100, Math.round(surplus / (ai.solarTotal + 0.001) * 100 + ai.battery * 0.2)));

    ai.network = 'Online';
    ai.security = ai.battery > 15 ? 'Sicher' : 'Warnung';

    if (compute.enabled) {
      compute.share = Math.min(compute.maxLoad, compute.share + Math.sin(this.t * 0.5) * 0.5);
      compute.power = +(compute.share / 100 * 4.2).toFixed(2);
      compute.jobs = 2 + Math.floor(compute.share / 12) + Math.floor(Math.random() * 2);
      compute.temp = +(36 + compute.share * 0.18 + Math.sin(this.t) * 1.5).toFixed(1);
      compute.payout += compute.power * dt * 0.012;
    } else {
      compute.share = 0;
      compute.power = 0;
      compute.jobs = 0;
      compute.temp = 0;
      compute.payout = +compute.payout.toFixed(3);
    }
    compute.payout = +compute.payout.toFixed(3);
  }
}
