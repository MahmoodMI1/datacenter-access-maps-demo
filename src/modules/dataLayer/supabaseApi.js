import { supabase } from "../../lib/supabase";

// ============================================
// MAPS
// ============================================

export async function fetchMaps() {
  const { data, error } = await supabase
    .from("maps")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMap(name, fileType, width, height) {
  const { data, error } = await supabase
    .from("maps")
    .insert({ name, file_type: fileType, width, height })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMap(id, updates) {
  const { data, error } = await supabase
    .from("maps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMap(id) {
  const { error } = await supabase.from("maps").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// MAP FILES (Supabase Storage)
// ============================================

const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

export async function uploadMapFile(file, mapId) {
  const ext = file.name.split(".").pop();
  const path = `maps/${mapId}/plan.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("map-files")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  // Store the storage path (not a public URL) so we can generate signed URLs on demand
  await updateMap(mapId, { file_url: path });
  return path;
}

export async function getMapFileUrl(mapId) {
  const { data: row, error } = await supabase
    .from("maps")
    .select("file_url")
    .eq("id", mapId)
    .single();
  if (error) throw error;

  const path = row?.file_url;
  if (!path) return null;

  // Generate a time-limited signed URL for the private bucket
  const { data, error: signError } = await supabase.storage
    .from("map-files")
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (signError) throw signError;
  return data.signedUrl;
}

// ============================================
// NODES
// ============================================

export async function fetchNodes(mapId) {
  const { data, error } = await supabase
    .from("nodes")
    .select("*")
    .eq("map_id", mapId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createNode(mapId, name, xPct, yPct) {
  const { data, error } = await supabase
    .from("nodes")
    .insert({ map_id: mapId, name, x_pct: xPct, y_pct: yPct })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNode(id, updates) {
  const { data, error } = await supabase
    .from("nodes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNode(id) {
  const { error } = await supabase.from("nodes").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllNodes(mapId) {
  const { error } = await supabase
    .from("nodes")
    .delete()
    .eq("map_id", mapId);
  if (error) throw error;
}

export async function fetchNodeCount(mapId) {
  const { count, error } = await supabase
    .from("nodes")
    .select("*", { count: "exact", head: true })
    .eq("map_id", mapId);
  if (error) throw error;
  return count ?? 0;
}
