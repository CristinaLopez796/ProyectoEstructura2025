import { supabase } from '../config/supabaseClient';

// ========== AUTENTICACIÓN ==========
export const supabaseAuth = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};

// ========== TABLA: PATIENTS (Cola de Espera) ==========
export const supabaseDb = {
  async insertPatient(patient: Omit<any, 'id' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([{ ...patient, user_id: user.id }])
      .select();

    return { data, error };
  },

  async getPatients() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('urgencia', { ascending: true })
      .order('queued_at', { ascending: true });

    return { data, error };
  },

  async getPatientById(id: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  async updatePatient(id: string, updates: any) {
    const { data, error } = await supabase
      .from('patients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    return { data, error };
  },

  async deletePatient(id: string) {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    return { error };
  },

  async getPatientsByUrgency(urgency: 1 | 2 | 3) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('urgencia', urgency)
      .order('queued_at', { ascending: true });

    return { data, error };
  },
};

// ========== TABLA: APPOINTMENT_HISTORY (Historial) ==========
export const appointmentHistory = {
  async addHistory(historyItem: any) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('appointment_history')
      .insert([{
        patient_name: historyItem.paciente.nombre,
        patient_birthday: historyItem.paciente.fechaNacimiento,
        symptoms: historyItem.paciente.sintomas,
        urgency: historyItem.paciente.urgencia,
        expediente: historyItem.paciente.expediente,
        attended_at: historyItem.atendidoEn,
        waited_ms: historyItem.waitedMs || null,
        patient_id: historyItem.paciente.id || null,
        user_id: user.id,
      }])
      .select();

    return { data, error };
  },

  async getHistory() {
    const { data, error } = await supabase
      .from('appointment_history')
      .select('*')
      .order('attended_at', { ascending: false });

    return { data, error };
  },

  async deleteHistory(id: string) {
    const { error } = await supabase
      .from('appointment_history')
      .delete()
      .eq('id', id);

    return { error };
  },

  async clearAllHistory() {
    const { error } = await supabase
      .from('appointment_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return { error };
  },
};

// ========== TABLA: USER_SETTINGS (Configuraciones) ==========
export const userSettings = {
  async getSettings() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return { data, error };
  },

  async createSettings(settings: any) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .insert([{ ...settings, user_id: user.id }])
      .select();

    return { data, error };
  },

  async updateSettings(settings: any) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select();

    return { data, error };
  },

  async toggleDarkMode(isDark: boolean) {
    return userSettings.updateSettings({ dark_mode: isDark });
  },
};

// ========== TABLA: USER_PROFILES (Perfil) ==========
export const userProfile = {
  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { data, error };
  },

  async createProfile(profile: any) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{ id: user.id, ...profile }])
      .select();

    return { data, error };
  },

  async updateProfile(profile: any) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select();

    return { data, error };
  },
};

// ========== TABLA: STATISTICS (Estadísticas) ==========
export const statistics = {
  async getStatistics() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('statistics')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return { data, error };
  },

  async createStatistics() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('statistics')
      .insert([{ user_id: user.id }])
      .select();

    return { data, error };
  },

  async updateStatistics(stats: any) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuario no autenticado' } };
    }

    const { data, error } = await supabase
      .from('statistics')
      .update({ ...stats, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select();

    return { data, error };
  },
};
