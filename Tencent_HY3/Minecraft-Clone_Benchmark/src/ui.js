import { HOTBAR, BLOCKS } from './blocks.js'
import { tileUV, atlasTexture } from './textures.js'

const HEART_COUNT = 10

export class UI {
  constructor() {
    this.heartsEl = document.getElementById('hearts')
    this.hotbarEl = document.getElementById('hotbar')
    this.modeEl = document.getElementById('mode')
    this.toastEl = document.getElementById('toast')
    this._buildHearts()
    this._buildHotbar()
    this._toastTimer = null
  }

  _buildHearts() {
    this.heartsEl.innerHTML = ''
    this.heartEls = []
    for (let i = 0; i < HEART_COUNT; i++) {
      const h = document.createElement('div')
      h.className = 'heart'
      this.heartsEl.appendChild(h)
      this.heartEls.push(h)
    }
  }

  _buildHotbar() {
    this.hotbarEl.innerHTML = ''
    this.slotEls = []
    const img = atlasTexture.image
    HOTBAR.forEach((type, i) => {
      const slot = document.createElement('div')
      slot.className = 'slot'
      const sw = document.createElement('div')
      sw.className = 'swatch'
      const def = BLOCKS[type]
      // sample average color from atlas tile
      const tv = tileUV(def.top)
      sw.style.background = sampleColor(img, tv)
      const num = document.createElement('div')
      num.className = 'num'
      num.textContent = i + 1
      slot.appendChild(sw); slot.appendChild(num)
      this.hotbarEl.appendChild(slot)
      this.slotEls.push(slot)
    })
  }

  setHealth(hp) {
    for (let i = 0; i < HEART_COUNT; i++) {
      this.heartEls[i].classList.toggle('empty', hp < (i + 1) * 2)
    }
  }
  setSelected(i) {
    this.slotEls.forEach((s, k) => s.classList.toggle('active', k === i))
  }
  setMode(m) { this.modeEl.textContent = m === 'creative' ? 'CREATIVE' : 'SURVIVAL' }
  toast(msg) {
    this.toastEl.textContent = msg
    this.toastEl.style.opacity = '1'
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => { this.toastEl.style.opacity = '0' }, 1600)
  }
}

function sampleColor(img, tv) {
  const col = 8, row = 8
  const x = Math.round(tv.u0 * img.width) + col
  const y = Math.round((1 - tv.v1) * img.height) + row
  const d = img.getContext('2d').getImageData(x, y, 1, 1).data
  return `rgb(${d[0]},${d[1]},${d[2]})`
}
