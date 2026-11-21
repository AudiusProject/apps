/* globals Chart */

// @ts-ignore
Chart.elements.Rectangle.prototype.draw = function () {
  const ctx = this._chart.ctx
  const vm = this._view
  let left, right, top, bottom, signX, signY, borderSkipped, radius
  let borderWidth = vm.borderWidth
  const cornerRadius = 2

  if (!vm.horizontal) {
    left = vm.x - vm.width / 2
    right = vm.x + vm.width / 2
    top = vm.y
    bottom = vm.base
    signX = 1
    signY = bottom > top ? 1 : -1
    borderSkipped = vm.borderSkipped || 'bottom'
  } else {
    left = vm.base
    right = vm.x
    top = vm.y - vm.height / 2
    bottom = vm.y + vm.height / 2
    signX = right > left ? 1 : -1
    signY = 1
    borderSkipped = vm.borderSkipped || 'left'
  }

  if (borderWidth) {
    const barSize = Math.min(Math.abs(left - right), Math.abs(top - bottom))
    borderWidth = borderWidth > barSize ? barSize : borderWidth
    const halfStroke = borderWidth / 2
    const borderLeft =
      left + (borderSkipped !== 'left' ? halfStroke * signX : 0)
    const borderRight =
      right + (borderSkipped !== 'right' ? -halfStroke * signX : 0)
    const borderTop = top + (borderSkipped !== 'top' ? halfStroke * signY : 0)
    const borderBottom =
      bottom + (borderSkipped !== 'bottom' ? -halfStroke * signY : 0)
    if (borderLeft !== borderRight) {
      top = borderTop
      bottom = borderBottom
    }
    if (borderTop !== borderBottom) {
      left = borderLeft
      right = borderRight
    }
  }

  ctx.beginPath()
  ctx.fillStyle = vm.backgroundColor
  ctx.strokeStyle = vm.borderColor
  ctx.lineWidth = borderWidth

  const corners = [
    [left, bottom],
    [left, top],
    [right, top],
    [right, bottom]
  ]

  const borders = ['bottom', 'left', 'top', 'right']
  let startCorner = borders.indexOf(borderSkipped, 0)
  if (startCorner === -1) {
    startCorner = 0
  }

  function cornerAt(index: any) {
    return corners[(startCorner + index) % 4]
  }

  let corner = cornerAt(0)
  let width, height, x, y, nextCornerId
  let x_tl, x_tr, y_tl, y_tr
  let x_bl, x_br, y_bl, y_br
  ctx.moveTo(corner[0], corner[1])

  for (let i = 1; i < 4; i++) {
    corner = cornerAt(i)
    nextCornerId = i + 1
    if (nextCornerId === 4) {
      nextCornerId = 0
    }

    width = corners[2][0] - corners[1][0]
    height = corners[0][1] - corners[1][1]
    x = corners[1][0]
    y = corners[1][1]

    radius = cornerRadius

    if (radius > Math.abs(height) / 2) {
      radius = Math.floor(Math.abs(height) / 2)
    }
    if (radius > Math.abs(width) / 2) {
      radius = Math.floor(Math.abs(width) / 2)
    }

    if (height < 0) {
      x_tl = x
      x_tr = x + width
      y_tl = y + height
      y_tr = y + height

      x_bl = x
      x_br = x + width
      y_bl = y
      y_br = y

      ctx.moveTo(x_bl + radius, y_bl)
      ctx.lineTo(x_br - radius, y_br)
      ctx.quadraticCurveTo(x_br, y_br, x_br, y_br - radius)
      ctx.lineTo(x_tr, y_tr + radius)
      ctx.quadraticCurveTo(x_tr, y_tr, x_tr - radius, y_tr)
      ctx.lineTo(x_tl + radius, y_tl)
      ctx.quadraticCurveTo(x_tl, y_tl, x_tl, y_tl + radius)
      ctx.lineTo(x_bl, y_bl - radius)
      ctx.quadraticCurveTo(x_bl, y_bl, x_bl + radius, y_bl)
    } else if (width < 0) {
      x_tl = x + width
      x_tr = x
      y_tl = y
      y_tr = y

      x_bl = x + width
      x_br = x
      y_bl = y + height
      y_br = y + height

      ctx.moveTo(x_bl + radius, y_bl)
      ctx.lineTo(x_br - radius, y_br)
      ctx.quadraticCurveTo(x_br, y_br, x_br, y_br - radius)
      ctx.lineTo(x_tr, y_tr + radius)
      ctx.quadraticCurveTo(x_tr, y_tr, x_tr - radius, y_tr)
      ctx.lineTo(x_tl + radius, y_tl)
      ctx.quadraticCurveTo(x_tl, y_tl, x_tl, y_tl + radius)
      ctx.lineTo(x_bl, y_bl - radius)
      ctx.quadraticCurveTo(x_bl, y_bl, x_bl + radius, y_bl)
    } else {
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
      )
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
    }
  }

  ctx.fill()
  if (borderWidth) {
    ctx.stroke()
  }
}
