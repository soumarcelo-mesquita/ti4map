import { supabase } from '@/lib/supabase';

/**
 * Keep-alive ping for the free-tier Supabase project (paused after ~7 days
 * without activity). Runs a real query — the PostgREST equivalent of a
 * `SELECT 1` — so the database registers traffic. Hit daily by the Vercel
 * cron configured in vercel.json.
 */
export async function GET() {
  const { error } = await supabase.from('rooms').select('id').limit(1);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, pingedAt: new Date().toISOString() });
}
