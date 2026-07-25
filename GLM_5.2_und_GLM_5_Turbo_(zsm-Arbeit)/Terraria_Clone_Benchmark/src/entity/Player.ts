// Player entity: movement, jump, swim, flying (creative), inventory/hotbar,
// tool swing animation, and procedural character sprite.

import { TILE } from '../block/Blocks';
import { World } from '../game/World';
import { Entity } from './Entity';
import { getSprite, shade, pxRand, TEX_SIZE } from '../textures/TextureAtlas';
import { ToolDef } from '../tools/Tools';
import { getToolIcon } from '../tools/Tools';

export interface InvSlot {
  block?: number;
  tool?: ToolDef;
  count: number;
}

export type GameMode = 'survival' | 'creative';

export class Player extends Entity {
  kind = 'player';
  width = 0.6;
  height = 1.8;
  maxHealth = 20;
  health = 20;

  mode: GameMode = 'survival';
  /** selected hotbar index 0..8 */
  selected = 0;
  hotbar: (InvSlot | null)[] = new Array(9).fill(null);
  /** extra inventory (3x9) */
  inventory: (InvSlot | null)[] = new Array(27).fill(null);

  // animation
  walkPhase = 0;
  armSwing = 0; // 0..1 progress of swing
  swinging = false;
  attackCooldown = 0;
  /** breathing/idle bob */
  idleTime = 0;

  // mining progress for current target {tx,ty} -> [0..1]
  miningTarget: { tx: number; ty: number } | null = null;
  miningProgress = 0;

  // emote / feedback
  hurtFlash = 0;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }

  get flying(): boolean {
    return this.mode === 'creative';
  }

  /** give starter tools/items */
  giveStarterCreative() {
    // creative: full hotbar of blocks + tools
    const blocks = [1, 3, 9, 11, 17, 19, 13, 14, 15];
    blocks.forEach((b, i) => (this.hotbar[i] = { block: b, count: 999 }));
  }

  giveStarterSurvival() {
    this.hotbar[0] = { tool: toolById('wood_axe')!, count: 1 };
    this.hotbar[1] = { tool: toolById('wood_pickaxe')!, count: 1 };
    this.hotbar[2] = { tool: toolById('wood_sword')!, count: 1 };
    this.hotbar[3] = { block: 18 /*torch*/, count: 10 };
  }

  get selectedSlot(): InvSlot | null {
    return this.hotbar[this.selected];
  }

  protected tick(dt: number, _world: World) {
    this.idleTime += dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.armSwing > 0) {
      this.armSwing -= dt * 3;
      if (this.armSwing <= 0) {
        this.armSwing = 0;
        this.swinging = false;
      }
    }
    if (this.walkPhase > 0 && Math.abs(this.vx) < 0.05 && this.onGround) this.walkPhase = 0;
  }

  /** trigger a swing animation (used for mining/attacking) */
  swing() {
    this.armSwing = 1;
    this.swinging = true;
  }

  /** take damage only in survival */
  override hurt(amount: number, knockX: number, knockY: number): boolean {
    if (this.mode === 'creative') return false;
    const took = super.hurt(amount, knockX, knockY);
    if (took) this.hurtFlash = 0.3;
    return took;
  }

  /** add an item to inventory, returns leftover count */
  addItem(block: number, count = 1, tool?: ToolDef): number {
    // stack tools separately, blocks stack
    const target = tool ? this.hotbar.concat(this.inventory) : this.hotbar.concat(this.inventory);
    // try to stack first
    for (let i = 0; i < target.length && count > 0; i++) {
      const s = target[i];
      if (!s) continue;
      if (tool && s.tool && s.tool.id === tool.id) { s.count += count; return 0; }
      if (!tool && s.block === block) { s.count += count; return 0; }
    }
    // place in empty slot
    for (let i = 0; i < target.length && count > 0; i++) {
      if (!target[i]) {
        target[i] = tool ? { tool, count: Math.min(count, 1) } : { block, count };
        count = tool ? count - 1 : 0;
      }
    }
    return count;
  }

  /** remove one item from the currently selected slot */
  consumeSelected(): boolean {
    const s = this.selectedSlot;
    if (!s) return false;
    s.count--;
    if (s.count <= 0) this.hotbar[this.selected] = null;
    return true;
  }

  render(ctx: CanvasRenderingContext2D, cam: { x: number; y: number; scale: number }, vw: number, vh: number) {
    const rect = this.screenRect(cam, vw, vh);
    // shadow
    drawShadow(ctx, rect.x + rect.w / 2, rect.y + rect.h, rect.w * 0.9);

    // character: head, body, arms, legs animated
    const flip = this.facing === -1;
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h);
    if (flip) ctx.scale(-1, 1);

    const px = rect.w / 8; // pixel size (8px sprite per "unit")
    const moving = Math.abs(this.vx) > 0.5;
    if (moving) this.walkPhase += 0.25;
    const swing = Math.sin(this.walkPhase) * (moving ? 1 : 0);
    const bob = Math.sin(this.idleTime * 3) * 0.5 * (moving ? 0 : 1);

    // colors
    const skin = '#e8b48a';
    const shirt = this.mode === 'creative' ? '#3aa0e0' : '#c84040';
    const pants = '#2a3a6a';
    const hair = '#5a3a1a';

    // legs
    ctx.fillStyle = pants;
    const legSwing = swing * 2 * px;
    ctx.fillRect(-3 * px, -4 * px + bob, 2 * px, 4 * px + legSwing);
    ctx.fillRect(1 * px, -4 * px + bob, 2 * px, 4 * px - legSwing);

    // body
    ctx.fillStyle = shirt;
    ctx.fillRect(-3 * px, -7 * px + bob, 6 * px, 3 * px);
    // belt
    ctx.fillStyle = shade(pants, 0.7);
    ctx.fillRect(-3 * px, -4 * px + bob, 6 * px, 0.5 * px);

    // arms (with swing animation when mining/attacking)
    ctx.fillStyle = skin;
    const swingArm = this.armSwing > 0 ? Math.sin((1 - this.armSwing) * Math.PI) : 0;
    const armAngle = swingArm * 2.2; // radians forward
    ctx.save();
    ctx.translate(2.5 * px, -6.5 * px + bob);
    ctx.rotate(-armAngle);
    ctx.fillRect(0, 0, 1.5 * px, 3.5 * px);
    // tool in hand
    const sel = this.selectedSlot;
    if (sel?.tool) {
      const icon = getToolIcon(sel.tool);
      ctx.save();
      ctx.scale(px / 2, px / 2);
      ctx.drawImage(icon, 0, -8, 16, 16);
      ctx.restore();
    }
    ctx.restore();
    // back arm
    ctx.fillStyle = shade(skin, 0.85);
    ctx.fillRect(-4 * px, -7 * px + bob, 1.5 * px, 3.5 * px);

    // head
    ctx.fillStyle = skin;
    ctx.fillRect(-2.5 * px, -10.5 * px + bob, 5 * px, 4 * px);
    // hair
    ctx.fillStyle = hair;
    ctx.fillRect(-2.5 * px, -11 * px + bob, 5 * px, 1.5 * px);
    ctx.fillRect(-2.5 * px, -10.5 * px + bob, 1 * px, 1 * px);
    ctx.fillRect(1.5 * px, -10.5 * px + bob, 1 * px, 1 * px);
    // eye
    ctx.fillStyle = '#000';
    ctx.fillRect(1 * px, -9 * px + bob, 0.8 * px, 0.8 * px);

    // hurt flash overlay
    if (this.flash > 0 || this.hurtFlash > 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ff3030';
      ctx.fillRect(-4 * px, -11 * px + bob, 8 * px, 11 * px);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // creative wings indicator (tiny wings)
    if (this.mode === 'creative') {
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h * 0.4);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const wf = Math.sin(this.idleTime * 10) * 2 + 4;
      ctx.fillRect(-rect.w * 0.4, -2, rect.w * 0.3, wf);
      ctx.fillRect(rect.w * 0.1, -2, rect.w * 0.3, wf);
      ctx.restore();
    }
  }
}

// helper to find a tool by id without circular imports at top
import { TOOL_BY_ID } from '../tools/Tools';
function toolById(id: string): ToolDef | undefined {
  return TOOL_BY_ID[id];
}

// shadow blob
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, w / 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// sprite registration for any pre-rendered player face (unused but available)
export function registerPlayerFace(): HTMLCanvasElement {
  return getSprite('player_face', (ctx) => {
    ctx.fillStyle = '#e8b48a';
    ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(3, 3, 10, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(6, 7, 1, 2); ctx.fillRect(9, 7, 1, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(7, 11, 2, 1);
  });
}
