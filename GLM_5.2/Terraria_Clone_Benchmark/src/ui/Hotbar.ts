// Hotbar UI: renders the 9-slot hotbar at the bottom of the screen with
// block/tool icons and counts. Handles numeric + scroll selection.

import { getBlockTexture, getSprite } from '../textures/TextureAtlas';
import { Player, InvSlot } from '../entity/Player';
import { getToolIcon } from '../tools/Tools';

const SLOT = 44; // px
const GAP = 4;

export class Hotbar {
  constructor(public player: Player) {}

  get width() { return 9 * (SLOT + GAP) - GAP; }

  /** draw centered at bottom of screen */
  render(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const startX = (vw - this.width) / 2;
    const y = vh - SLOT - 12;
    for (let i = 0; i < 9; i++) {
      const x = startX + i * (SLOT + GAP);
      const selected = i === this.player.selected;
      // slot bg
      ctx.fillStyle = selected ? 'rgba(80,140,200,0.85)' : 'rgba(20,20,30,0.7)';
      ctx.fillRect(x, y, SLOT, SLOT);
      ctx.strokeStyle = selected ? '#fff' : 'rgba(120,140,160,0.5)';
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1);

      const slot = this.player.hotbar[i];
      if (slot) this.drawSlotContent(ctx, slot, x, y);
      // slot number
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}`, x + 3, y + 11);
    }
  }

  private drawSlotContent(ctx: CanvasRenderingContext2D, slot: InvSlot, x: number, y: number) {
    const pad = 6;
    const inner = SLOT - pad * 2;
    if (slot.tool) {
      const icon = getToolIcon(slot.tool);
      ctx.drawImage(icon, x + pad, y + pad, inner, inner);
    } else if (slot.block !== undefined) {
      const tex = getBlockTexture(slot.block);
      ctx.drawImage(tex, x + pad, y + pad, inner, inner);
    }
    if (slot.count > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      const label = slot.count >= 999 ? '∞' : `${slot.count}`;
      ctx.fillText(label, x + SLOT - 4, y + SLOT - 2);
      ctx.textBaseline = 'alphabetic';
    }
  }
}
