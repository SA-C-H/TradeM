import { supabase } from '@/integrations/supabase/client';

export async function uploadTradePhoto(file: File, userId: string, kind: 'before' | 'after' = 'before'): Promise<{ path: string }> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('trade-photos').upload(fileName, file, { upsert: false });
  if (error) throw error;
  return { path: fileName };
}

export function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from('trade-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('trade-photos').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePhotoFromStorage(path: string) {
  await supabase.storage.from('trade-photos').remove([path]);
}
