import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/** Conexão única com o Supabase (usada somente pela camada Model). */
export const SUPABASE_CLIENTE = new InjectionToken<SupabaseClient>('SUPABASE_CLIENTE', {
  providedIn: 'root',
  factory: () => {
    const { supabaseUrl, supabasePublishableKey } = environment;
    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error(
        'Supabase não configurado: preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no .env',
      );
    }
    return createClient(supabaseUrl, supabasePublishableKey);
  },
});
