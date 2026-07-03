import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const DEVICES_TABLE = "devices";
const HISTORY_TABLE = "device_history";
const ALERTS_TABLE = "alerts";

/* ── devices ───────────────────────────────────────────── */

export async function fetchAllDevices() {
  const { data, error } = await supabase.from(DEVICES_TABLE).select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertDevice(device) {
  const { data, error } = await supabase
    .from(DEVICES_TABLE)
    .upsert(device, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ── history ───────────────────────────────────────────── */

export async function insertHistoryRow(deviceId, status, powerWatts) {
  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .insert({ device_id: deviceId, status, power_watts: powerWatts })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchHistorySince(timestamp) {
  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select("*")
    .gte("created_at", timestamp)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch all history rows created before timestamp.
 * Used to determine each device's state at a given cutoff.
 * Deduplication (latest per device) is handled by the caller.
 */
export async function fetchAllHistoryBefore(timestamp) {
  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select("*")
    .lt("created_at", timestamp)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ── alerts ────────────────────────────────────────────── */

export async function insertAlert(alert) {
  const { data, error } = await supabase
    .from(ALERTS_TABLE)
    .insert(alert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchActiveAlerts() {
  const { data, error } = await supabase
    .from(ALERTS_TABLE)
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function resolveAlert(id) {
  const { data, error } = await supabase
    .from(ALERTS_TABLE)
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
