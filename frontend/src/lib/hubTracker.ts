import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// You can specify a constant ID or read from env. We will define an arbitrary ID for Transcriptor.
const TRANSCRIPTOR_SISTEMA_ID = 'e7a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c' 

const HUB_SUPABASE_URL = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL
const HUB_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY

let hubClient: SupabaseClient | null = null

function getHubClient(): SupabaseClient | null {
  if (!HUB_SUPABASE_URL || !HUB_SUPABASE_ANON_KEY) {
    console.warn('[HubTracker] Missing NEXT_PUBLIC_HUB_SUPABASE_URL or NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY')
    return null
  }
  if (!hubClient) {
    hubClient = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY)
  }
  return hubClient
}

async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip || null
  } catch { return null }
}

interface GeoResult { lat: number; lng: number }

function getGeoLocation(): Promise<GeoResult | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { 
        resolve(null); return 
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  })
}

export async function trackLogin(userId: string) {
  try {
    const hub = getHubClient()
    if (!hub) return

    const [ip, geo] = await Promise.all([getPublicIP(), getGeoLocation()])
    await hub.rpc('hub_log_external_event', {
      p_user_identifier: userId,
      p_evento: 'login',
      p_sistema_id: TRANSCRIPTOR_SISTEMA_ID,
      p_ip: ip,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      p_latitud: geo?.lat || null,
      p_longitud: geo?.lng || null,
      p_metadata: { source: 'transcriptor' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}

export async function trackLogout(userId: string) {
  try {
    const hub = getHubClient()
    if (!hub) return

    await hub.rpc('hub_log_external_event', {
      p_user_identifier: userId,
      p_evento: 'logout',
      p_sistema_id: TRANSCRIPTOR_SISTEMA_ID,
      p_ip: null,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      p_latitud: null,
      p_longitud: null,
      p_metadata: { source: 'transcriptor' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}
