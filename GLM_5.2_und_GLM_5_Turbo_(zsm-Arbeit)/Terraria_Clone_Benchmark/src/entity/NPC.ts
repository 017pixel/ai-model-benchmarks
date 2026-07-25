// Friendly NPCs: Guide, Merchant, Nurse. They stand near their house, wander
// slightly, and open a dialog when the player interacts (E while nearby).

import { TILE } from '../block/Blocks';
import { World } from '../game/World';
import { Entity } from './Entity';
import { shade } from '../textures/TextureAtlas';

export type NPCKind = 'guide' | 'merchant' | 'nurse';

export interface DialogLine { speaker: string; text: string; }

export const NPC_DIALOGS: Record<NPCKind, DialogLine[][]> = {
  guide: [
    [
      { speaker: 'Guide', text: 'Willkommen, Abenteurer! Ich bin der Guide.' },
      { speaker: 'Guide', text: 'Bewege dich mit A und D, springe mit W oder Leertaste.' },
      { speaker: 'Guide', text: 'Linke Maustaste: Blöcke abbauen und angreifen.' },
      { speaker: 'Guide', text: 'Rechte Maustaste: Blöcke aus der Hotbar platzieren.' },
      { speaker: 'Guide', text: 'Drücke M, um zwischen Survival und Creative zu wechseln.' },
      { speaker: 'Guide', text: 'In Creative kannst du fliegen (halte W) und hast unendlich Blöcke.' },
      { speaker: 'Guide', text: 'Drücke E, um dein Inventar zu öffnen. Viel Erfolg!' },
    ],
    [
      { speaker: 'Guide', text: 'Tipp: Baue Holz ab, dann Stein. Aus Stein werden bessere Werkzeuge.' },
      { speaker: 'Guide', text: 'Tief in den Höhlen warten Eisenerz, Gold und Diamanten.' },
      { speaker: 'Guide', text: 'Nachts werden die Monster gefährlich. Baue ein Haus!' },
      { speaker: 'Guide', text: 'Stelle einen "Verdächtig Blickenden Blick" her und benutze ihn nachts, um den Boss zu rufen.' },
    ],
    [
      { speaker: 'Guide', text: 'Der Boss wurde besiegt? Beeindruckend! Du bist ein wahrer Held.' },
    ],
  ],
  merchant: [
    [
      { speaker: 'Händler', text: 'Willkommen in meinem Laden! Ich verkaufe... bald.' },
      { speaker: 'Händler', text: 'Sammle Münzen durch Monster und Verkäufe. (Noch im Aufbau!)' },
      { speaker: 'Händler', text: 'Bis dahin: ein gratis Fackelbündel für dich. Pass auf dich auf!' },
    ],
  ],
  nurse: [
    [
      { speaker: 'Krankenschwester', text: 'Du siehst verletzt aus. Hier, lass mich helfen.' },
      { speaker: 'Krankenschwester', text: '(Sie heilt dich vollständig.)' },
      { speaker: 'Krankenschwester', text: 'Komm jederzeit wieder, wenn du Wunden hast.' },
    ],
  ],
};

export class NPC extends Entity {
  kind = 'npc';
  npcKind: NPCKind;
  homeX: number;
  wanderTimer = 0;
  color: string;

  constructor(kind: NPCKind, x: number, y: number) {
    super();
    this.npcKind = kind;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.width = 0.6;
    this.height = 1.7;
    this.maxHealth = 50;
    this.health = 50;
    this.contactDamage = 0;
    this.color = kind === 'guide' ? '#3aa050' : kind === 'merchant' ? '#704020' : '#e04060';
  }

  protected tick(dt: number, world: World) {
    // gentle wander near home
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 2 + Math.random() * 3;
      const choice = Math.random();
      if (choice < 0.4) this.vx = 1.2;
      else if (choice < 0.8) this.vx = -1.2;
      else this.vx = 0;
      this.facing = this.vx >= 0 ? 1 : -1;
    }
    if (Math.abs(this.x - this.homeX) > 3) {
      this.vx = this.x > this.homeX ? -1.5 : 1.5;
    }
    this.applyGravity(dt);
    this.moveAndCollide(world, dt);
  }

  /** pick a dialog set, varying by game progress */
  getDialog(bossDefeated: boolean): DialogLine[] {
    const sets = NPC_DIALOGS[this.npcKind];
    if (this.npcKind === 'guide' && bossDefeated && sets.length >= 3) return sets[2];
    return sets[Math.min(1, sets.length - 1)];
  }

  render(ctx: CanvasRenderingContext2D, cam: { x: number; y: number; scale: number }, vw: number, vh: number) {
    const rect = this.screenRect(cam, vw, vh);
    drawShadow(ctx, rect.x + rect.w / 2, rect.y + rect.h, rect.w * 0.85);
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h);
    if (this.facing === -1) ctx.scale(-1, 1);
    const px = rect.w / 8;
    const moving = Math.abs(this.vx) > 0.5;
    const swing = moving ? Math.sin(performance.now() / 120) * 2 * px : 0;
    // legs
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-3 * px, -4 * px, 2 * px, 4 * px + swing);
    ctx.fillRect(1 * px, -4 * px, 2 * px, 4 * px - swing);
    // body (robe/shirt)
    ctx.fillStyle = this.color;
    ctx.fillRect(-3 * px, -7 * px, 6 * px, 3 * px);
    // head
    ctx.fillStyle = '#e8b48a';
    ctx.fillRect(-2.5 * px, -10.5 * px, 5 * px, 4 * px);
    // hair / hat
    ctx.fillStyle = shade(this.color, 0.7);
    ctx.fillRect(-2.5 * px, -11 * px, 5 * px, 1.5 * px);
    // eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(1 * px, -9 * px, 0.8 * px, 0.8 * px);
    // indicator "!" when talkable handled by HUD; nothing here
    ctx.restore();
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, w / 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
