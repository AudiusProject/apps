export const shadows = {
  near: {
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowColor: '#000',
    elevation: 1
  },
  mid: {
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowColor: '#000',
    elevation: 2
  },
  midInverted: {
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    shadowColor: '#000',
    elevation: 2
  },
  far: {
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.08,
    shadowColor: '#000',
    elevation: 3
  },
  emphasis: {
    shadowOffset: { width: 0, height: 1.34018 },
    shadowRadius: 8,
    shadowOpacity: 0.2,
    shadowColor: '#000',
    elevation: 6
  },
  special: {
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 17,
    shadowOpacity: 0.2,
    shadowColor: '#565776',
    elevation: 6
  },
  flat: {
    elevation: 0,
    shadowRadius: 0,
    shadowOpacity: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 }
  }
}
