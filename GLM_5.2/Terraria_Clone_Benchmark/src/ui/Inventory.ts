// Inventory overlay: shows player inventory grid, hotbar, and a craftable list.
// Visible while the inventory is open (E). Handles click-to-craft and basic
// click-to-move items (simplified: shift items between inv and hotbar).

import { BlockId, getBlock } from '../block/Blocks';
import { Player, InvSlot } from '../entity/Player';
import { RECIPES, countItems, consumeInputs } from '../game/Recipes';
import { getBlockTexture } from '../textures/TextureAtlas';
import { getToolIcon } from '../tools/Tools';

const SLOT = 40;
const GAP = 4;

export class InventoryUI {
  open = false;
  /** recipe scroll */
  scroll = 0;
  hoverRecipe = -1;

  constructor(public player: Player) {}

  toggle() {
    this.open = !this.open;
  }

  update() {
    // nothing dynamic
  }

  /** returns true if the click was handled here */
  handleClick(mx: number, my: number, nearTable: boolean): boolean {
    if (!this.open) return false;
    const craftRect = this.craftRect(window.innerWidth, window.innerHeight);
    if (mx >= craftRect.x && mx <= craftRect.x + craftRect.w && my >= craftRect.y && my <= craftRect.y + craftRect.h) {
      // figure out which recipe was clicked
      const slots = this.player.hotbar.concat(this.player.inventory);
      const avail = RECIPES.filter((r) => nearTable || !r.requiresTable);
      const rowH = SLOT + GAP;
      const localY = my - craftRect.y + this.scroll;
      const idx = Math.floor((localY - 40) / rowH);
      const colW = SLOT + GAP;
      const perRow = 4;
      const col = Math.floor((mx - craftRect.x) / colW);
      const row = Math.floor((localY - 40) / rowH);
      const flat = row * perRow + col;
      if (flat < 0 || flat >= avail.length) return true;
      const r = avail[flat];
      // can afford?
      const haveAll = r.inputs.every((i) => countItems(slots, i.block) >= i.count);
      if (haveAll) {
        consumeInputs(slots, r.inputs);
        const out = r.output;
        if (out.tool) this.player.addItem(out.block ?? BlockId.Air, out.count, out.tool);
        else if (out.block !== undefined) this.player.addItem(out.block, out.count);
      }
      return true;
    }
    return false;
  }

  private craftRect(vw: number, vh: number) {
    const w = SLOT * 4 + GAP * 5;
    const h = Math.min(vh - 120, 360);
    const x = vw - w - 30;
    const y = (vh - h) / 2;
    return { x, y, w, h };
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number, nearTable: boolean) {
    if (!this.open) return;
    // dim background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, vw, vh);

    // panel
    const panelW = 360;
    const panelH = 380;
    const px = (vw - panelW) / 2 - 100;
    const py = (vh - panelH) / 2;
    ctx.fillStyle = 'rgba(25,25,35,0.96)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#c8a050';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.fillStyle = '#ffd060';
    ctx.font = 'bold 16px Trebuchet MS';
    ctx.textAlign = 'left';
    ctx.fillText('Inventar', px + 12, py + 24);

    // inventory grid 9x3
    const startX = px + 12;
    const startY = py + 40;
    for (let i = 0; i < 27; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const x = startX + c * (SLOT + GAP);
      const y = startY + r * (SLOT + GAP);
      this.drawSlot(ctx, this.player.inventory[i], x, y);
    }
    // hotbar row
    const hbY = startY + 3 * (SLOT + GAP) + 14;
    ctx.fillStyle = '#aaa';
    ctx.font = '11px Trebuchet MS';
    ctx.fillText('Hotbar:', startX, hbY - 4);
    for (let i = 0; i < 9; i++) {
      const x = startX + i * (SLOT + GAP);
      const y = hbY;
      const sel = i === this.player.selected;
      this.drawSlot(ctx, this.player.hotbar[i], x, y, sel);
    }

    // crafting panel (right side)
    const cr = this.craftRect(vw, vh);
    ctx.fillStyle = 'rgba(25,25,35,0.96)';
    ctx.fillRect(cr.x, cr.y, cr.w, cr.h);
    ctx.strokeStyle = '#c8a050';
    ctx.strokeRect(cr.x, cr.y, cr.w, cr.h);
    ctx.fillStyle = nearTable ? '#ffd060' : '#a08040';
    ctx.font = 'bold 14px Trebuchet MS';
    ctx.fillText(nearTable ? 'Handwerk (Werkbank)' : 'Handwerk (Hand)', cr.x + 8, cr.y + 20);
    if (!nearTable) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px Trebuchet MS';
      ctx.fillText('Stelle dich an eine Werkbank', cr.x + 8, cr.y + 34);
    }

    const slots = this.player.hotbar.concat(this.player.inventory);
    const avail = RECIPES.filter((r) => nearTable || !r.requiresTable);
    const rowH = SLOT + GAP;
    const perRow = 4;
    const colW = SLOT + GAP;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cr.x, cr.y + 40, cr.w, cr.h - 48);
    ctx.clip();
    for (let i = 0; i < avail.length; i++) {
      const r = avail[i];
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = cr.x + col * colW;
      const y = cr.y + 40 + row * rowH - this.scroll;
      const haveAll = r.inputs.every((inp) => countItems(slots, inp.block) >= inp.count);
      ctx.fillStyle = haveAll ? 'rgba(60,120,60,0.7)' : 'rgba(40,40,40,0.7)';
      ctx.fillRect(x, y, SLOT, SLOT);
      ctx.strokeStyle = haveAll ? '#80ff80' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1);
      // output icon
      const out = r.output;
      if (out.tool) {
        ctx.drawImage(getToolIcon(out.tool), x + 6, y + 6, SLOT - 12, SLOT - 12);
      } else if (out.block !== undefined) {
        ctx.drawImage(getBlockTexture(out.block), x + 6, y + 6, SLOT - 12, SLOT - 12);
      }
      if (out.count > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${out.count}`, x + SLOT - 3, y + SLOT - 3);
        ctx.textAlign = 'left';
      }
    }
    ctx.restore();
    ctx.fillStyle = '#888';
    ctx.font = '11px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('Klicke zum Herstellen  ·  E zum Schließen', cr.x + cr.w / 2, cr.y + cr.h - 8);
    ctx.textAlign = 'left';
  }

  private drawSlot(ctx: CanvasRenderingContext2D, slot: InvSlot | null, x: number, y: number, highlight = false) {
    ctx.fillStyle = highlight ? 'rgba(80,140,200,0.8)' : 'rgba(50,50,60,0.8)';
    ctx.fillRect(x, y, SLOT, SLOT);
    ctx.strokeStyle = highlight ? '#fff' : 'rgba(120,140,160,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1);
    if (!slot) return;
    if (slot.tool) {
      ctx.drawImage(getToolIcon(slot.tool), x + 5, y + 5, SLOT - 10, SLOT - 10);
    } else if (slot.block !== undefined) {
      ctx.drawImage(getBlockTexture(slot.block), x + 5, y + 5, SLOT - 10, SLOT - 10);
    }
    if (slot.count > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${slot.count}`, x + SLOT - 3, y + SLOT - 3);
      ctx.textAlign = 'left';
    }
  }
}
