const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      throw err;
    }
  },

  async getDashboardSummary(params?: any) {
    try {
      const query = new URLSearchParams(params || {}).toString();
      const res = await fetch(`${API_URL}/dashboard/summary?${query}`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      throw err;
    }
  },

  async getCanonicalFields() {
    try {
      const res = await fetch(`${API_URL}/imports/canonical-fields`);
      if (!res.ok) throw new Error('Failed to fetch canonical fields');
      return await res.json();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  },

  async previewImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/imports/preview`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview import');
      return data;
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  },

  async validateImport(previewId: string, mapping: any, mode: string = 'upsert') {
    try {
      const res = await fetch(`${API_URL}/imports/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview_id: previewId, mapping, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to validate mapping');
      return data;
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  },

  async confirmImport(previewId: string, mapping: any, mode: string = 'upsert', importPartial: boolean = true) {
    try {
      const res = await fetch(`${API_URL}/imports/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview_id: previewId, mapping, mode, import_partial: importPartial }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm import');
      return data;
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  },

  async getImportHistory() {
    try {
      const res = await fetch(`${API_URL}/imports/history`);
      if (!res.ok) throw new Error('Failed to fetch import history');
      return await res.json();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  },

  async getStudents(params?: any) {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_URL}/students/?${query}`);
    if (!res.ok) throw new Error('Failed to fetch students');
    return res.json();
  },

  async getStudent(id: string) {
    const res = await fetch(`${API_URL}/students/${id}`);
    if (!res.ok) throw new Error('Failed to fetch student details');
    return res.json();
  },

  async getStudentBrief(id: string) {
    const res = await fetch(`${API_URL}/students/${id}/brief`);
    if (!res.ok) throw new Error('Failed to fetch student AI brief');
    return res.json();
  },

  async getReport(type: string, params?: any) {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_URL}/${type}?${query}`);
    if (!res.ok) throw new Error(`Failed to fetch ${type} report`);
    return res.json();
  },

  async getReportInsights(params?: any) {
    try {
      const query = new URLSearchParams(params || {}).toString();
      const res = await fetch(`${API_URL}/reports/insights?${query}`);
      if (!res.ok) throw new Error('Failed to fetch report insights');
      return await res.json();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  },

  async getInterventions() {
    try {
      const res = await fetch(`${API_URL}/interventions/`);
      if (!res.ok) throw new Error('Failed to fetch interventions');
      return await res.json();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  },

  async createIntervention(data: any) {
    try {
      const res = await fetch(`${API_URL}/interventions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save intervention');
      return await res.json();
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the backend server. Is Flask running on port 5000?');
      }
      throw err;
    }
  }
};
