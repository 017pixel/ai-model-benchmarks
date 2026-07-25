export class State {
  constructor() {
    this.data = {
      cameraMode: 'exterior',
      activeFloor: 'ground',
      exploded: false,
      cutaway: false,
      floorVisible: { ground: true, upper: true, attic: true, roof: true },
      timeOfDay: 0.38,
      autoTime: false,
      lightsOn: true,
      selected: null,
      aiPanelOpen: false,
      walkFloor: 'ground',
      ai: {
        solarPower: 0,
        battery: 0,
        consumption: 0,
        serverLoad: 0,
        indoorTemp: 21.5,
        outdoorTemp: 14,
        humidity: 45,
        airQuality: 96,
        network: 'Online',
        security: 'Sicher',
        autonomy: 0,
        solarTotal: 11.2
      },
      compute: {
        enabled: false,
        share: 0,
        power: 0,
        payout: 0,
        jobs: 0,
        temp: 0,
        maxLoad: 60,
        window: '22:00 – 06:00',
        privacy: 'isoliert'
      }
    };
    this.listeners = {};
  }

  on(key, fn) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(fn);
  }

  emit(key) {
    const fns = this.listeners[key];
    if (fns) fns.forEach(f => f(this.data[key], this.data));
    const all = this.listeners['*'];
    if (all) all.forEach(f => f(key, this.data));
  }

  set(key, value, silent = false) {
    this.data[key] = value;
    if (!silent) this.emit(key);
    if (!silent) this.emit('*');
  }

  get(key) {
    return this.data[key];
  }

  patch(path, value) {
    const parts = path.split('.');
    let obj = this.data;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    this.emit(path);
    this.emit('*');
  }
}
