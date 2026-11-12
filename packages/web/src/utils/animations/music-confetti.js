// Utility Functions to compute confetti physics

function degreesToRads(degrees) {
  return degrees / (180 * Math.PI)
}

function randomRange(min, max) {
  return min + Math.random() * (max - min)
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function range(start, end, step) {
  const arr = []
  for (let i = start; i < end; i += step) {
    arr.push(i)
  }
  return arr
}

function sample(array) {
  if (!Array.isArray(array) || array.length === 0) return undefined
  const randomIndex = Math.floor(Math.random() * array.length)
  return array[randomIndex]
}

const RANDOM_LETTERS =
  'abcdefghijklmnoqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890~!@#$%^&*()`™£¢∞§¶•ªº'

// How far apart columns are in matrix mode
const COLUMN_SPACING = 50

// Particle class representing a piece of confetti
// The particle holds the image, postion, and phsyics for moving in the animation
class Particle {
  constructor(
    path,
    color,
    x,
    y,
    opacity,
    sizeRatio,
    friction,
    gravity,
    rotate,
    swing
  ) {
    this.randomLetter =
      RANDOM_LETTERS[Math.floor(Math.random() * RANDOM_LETTERS.length)]
    this.path = path
    this.color = color
    this.center = x
    this.maxVx = swing > 0 ? randomRange(-10, 10) * sizeRatio : 0
    this.maxVy = randomRange(-4, -0.3) * sizeRatio
    this.y = y
    this.x = x
    this.friction = friction
    this.gravity = gravity
    this.opacity = opacity
    this.sizeRatio = sizeRatio
    this.vx = this.maxVx
    this.ax = swing > 0 ? randomRange(0.001, swing) : 0
    this.vy = this.maxVy
    this.angle = rotate > 0 ? degreesToRads(randomRange(0, 360)) : 0
    this.anglespin = rotate > 0 ? randomRange(-1 * rotate, rotate) : 0
  }

  update = (ctx) => {
    // Update particle position/physics
    this.x += this.vx
    this.y += this.vy
    this.vx += (this.center - this.x) * 0.8 * this.ax
    this.vx *= this.friction
    const vXDiff = 0.96 + 0.05 * Math.min(Math.abs(this.vx) / 10, 1)
    this.vy += this.gravity
    this.vy = this.vy * this.friction * vXDiff
    this.angle += this.anglespin

    // Draw onto canvas
    ctx.save()
    ctx.translate(Math.floor(this.x), Math.floor(this.y))
    ctx.rotate(this.angle)
    ctx.globalAlpha = this.opacity
    if (this.path) {
      ctx.scale(this.sizeRatio, this.sizeRatio)
      ctx.fillStyle = this.color
      ctx.fill(this.path)
    } else {
      // If no image, we must be in matrix mode

      // As letters descend down the screen, draw their ghosts
      // progressively higher up leading to a cool parallax effect
      const heightMultipler = this.y / 100

      // Draw the letter
      ctx.font = '14px Avenir Next LT Pro'
      ctx.fillStyle = 'rgba(12, 241, 12, 1)'
      ctx.fillText(this.randomLetter, 0, 0)

      // Draw lower opacity ghosts behind the falling letter
      ctx.fillStyle = 'rgba(12, 241, 12, 0.3)'
      ctx.fillText(this.randomLetter, 0, -10 * heightMultipler)
      ctx.fillStyle = 'rgba(12, 241, 12, 0.1)'
      ctx.fillText(this.randomLetter, 0, -20 * heightMultipler)
      ctx.fillStyle = 'rgba(12, 241, 12, 0.05)'
      ctx.fillText(this.randomLetter, 0, -30 * heightMultipler)
    }
    ctx.restore()
  }
}

export default class Confetti {
  constructor(
    canvas,
    paths,
    colors,
    recycle = false,
    limit = 100,
    friction = 0.99,
    gravity = 0.2,
    rotate = 0.1,
    swing = 0.01,
    particleRate,
    onCompletion
  ) {
    const { clientWidth: width, clientHeight: height } = canvas
    this.width = width
    this.height = height
    this.animationFrameId = null
    this.isResizeListenerAttached = false
    this.particleRate = particleRate
    this.paths = paths
    this.colors = colors
    this.runAnimation = false
    this.friction = friction
    this.gravity = gravity
    this.limit = limit
    this.rotate = rotate
    this.swing = swing
    this.recycle = recycle
    this.context = canvas.getContext('2d')
    this.particles = []
    this.particlesGenerated = 0
    this.onCompletion = onCompletion

    // For matrix, generate columns by iterating over width with a
    // COLUMN_SPACING step and then perturbing the values somewhat
    this.particleColumns = range(0, width, COLUMN_SPACING).map(
      (c) => c + Math.random() * COLUMN_SPACING - COLUMN_SPACING * 0.4
    )
  }

  handleResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight
  }

  attachResizeListener = () => {
    if (this.isResizeListenerAttached) return
    window.addEventListener('resize', this.handleResize)
    this.isResizeListenerAttached = true
  }

  detachResizeListener = () => {
    if (!this.isResizeListenerAttached) return
    window.removeEventListener('resize', this.handleResize)
    this.isResizeListenerAttached = false
  }

  generateParticle = (source, number) => {
    const x = this.swing
      ? randomRange(0, this.width)
      : sample(this.particleColumns)
    const y = -30 // Start the particle 30px above
    const opacity = this.swing ? randomRange(0.3, 0.9) : randomRange(0.8, 1) // Range from 0.3 to 0.9
    const size = this.swing ? ((opacity + 0.2) * 5) / 6 : 1 // range 0.5 to 1

    const path = this.paths
      ? this.paths[randomInt(0, this.paths.length - 1)]
      : null
    const color = this.colors
      ? this.colors[randomInt(0, this.colors.length - 1)]
      : null

    return new Particle(
      path,
      color,
      x,
      y,
      opacity,
      size,
      this.friction,
      this.gravity,
      this.rotate,
      this.swing
    )
  }

  removeParticleAt = (idx) => {
    this.particles.splice(idx, 1)
    if (!this.particles.length && this.onCompletion) {
      this.onCompletion()
    }
  }

  animate = () => {
    // Clear the previous screen
    this.context.clearRect(0, 0, this.width, this.height)

    const nP = this.particles.length

    // If recycling, continously create particles so that the number of particles is close to the limit
    const particleCount = this.recycle
      ? this.particles.length
      : this.particlesGenerated
    if (particleCount < this.limit) {
      if (particleCount < this.limit / 3) {
        this.particles.push(this.generateParticle())
        this.particlesGenerated += 1
      }
      if (particleCount < (2 * this.limit) / 3) {
        this.particles.push(this.generateParticle())
        this.particlesGenerated += 1
      }
      this.particles.push(this.generateParticle())
      this.particlesGenerated += 1
    }

    const removeParticlesIdx = []
    // Move each particle and remove if off the screen
    this.particles.forEach((p, i) => {
      p.update(this.context)
      if (
        p.y > this.height + 50 ||
        p.y < -100 ||
        p.x > this.width + 100 ||
        p.x < -100
      ) {
        if (this.recycle && particleCount <= this.limit) {
          // a brand new particle replacing the dead one
          this.particles[i] = this.generateParticle()
        } else {
          removeParticlesIdx.push(i)
        }
      }
    })

    // Remove all the particles at the same time after animation update
    for (let idx = 0; idx < removeParticlesIdx.length; idx += 1) {
      const particlesIndex =
        removeParticlesIdx[removeParticlesIdx.length - 1 - idx]
      this.removeParticleAt(particlesIndex)
    }

    return nP > 0 || this.particlesGenerated < this.limit
  }

  update = () => {
    this.animationFrameId = null
    if (!this.runAnimation) return
    if (this.animate()) {
      this.animationFrameId = window.requestAnimationFrame(this.update)
    } else {
      this.stop()
    }
  }

  stop = () => {
    this.runAnimation = false
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.detachResizeListener()
  }

  run = () => {
    if (this.runAnimation) return
    this.runAnimation = true
    this.attachResizeListener()
    if (this.animationFrameId === null) {
      this.animationFrameId = window.requestAnimationFrame(this.update)
    }
  }
}
