import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/** Conexão única com o Supabase (usada somente pela camada Model). */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const { supabaseUrl, supabaseAnonKey } = environment;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase não configurado: preencha supabaseUrl e supabaseAnonKey em src/environments/environment.ts',
      );
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  },
});
