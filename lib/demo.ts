// Investor / conference-room demo mode.

export const DEMO_KEY = 'relay_demo_mode'

export interface DemoScenario {
  label: string
  patientName: string
  origin: [number, number]
  hospitals: {
    id: string
    name: string
    lat: number
    lng: number
    address: string
    capability?: string
    phone?: string
  }[]
}

// Mumbai: Andheri East → Kokilaben / Lilavati corridor. Real coordinates, so
// the routing engine returns a genuine road route over real map tiles.
export const DEMO: DemoScenario = {
  label: 'Mumbai · Andheri East',
  patientName: 'Asha Kulkarni',
  origin: [19.1136, 72.8697],
  hospitals: [
    {
      id: 'demo-kokilaben',
      name: 'Kokilaben Dhirubhai Ambani Hospital',
      lat: 19.13,
      lng: 72.8258,
      address: 'Rao Saheb Achutrao Patwardhan Marg, Andheri West',
      capability: 'Cardiac catheterization lab',
      phone: '',
    },
    {
      id: 'demo-lilavati',
      name: 'Lilavati Hospital',
      lat: 19.0509,
      lng: 72.8296,
      address: 'A-791, Bandra Reclamation, Bandra West',
      capability: 'Cardiac catheterization lab',
      phone: '',
    },
    {
      id: 'demo-hinduja',
      name: 'P. D. Hinduja Hospital',
      lat: 19.027,
      lng: 72.8399,
      address: 'Veer Savarkar Marg, Mahim West',
      capability: 'Cardiac catheterization lab',
      phone: '',
    },
  ],
}

export function demoOn(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}
export function setDemo(on: boolean) {
  try {
    if (on) sessionStorage.setItem(DEMO_KEY, '1')
    else sessionStorage.removeItem(DEMO_KEY)
  } catch {}
}
