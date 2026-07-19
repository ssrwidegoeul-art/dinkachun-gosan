import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configOk = !!(url && key);
export const supabase = configOk ? createClient(url, key) : null;

// key-value 저장 헬퍼 (테이블: kv)
export async function kvGet(k) {
  if (!supabase) return null;
  const { data } = await supabase.from("kv").select("value").eq("key", k).maybeSingle();
  return data ? data.value : null;
}
export async function kvSet(k, v) {
  if (!supabase) return;
  await supabase.from("kv").upsert({ key: k, value: v, updated_at: new Date().toISOString() });
}
