const getBaseApiUrl = (): string => {
  let url = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!url) {
    url = import.meta.env.PROD
      ? 'https://studentarc-api.onrender.com'
      : 'http://127.0.0.1:5000';
  }
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Ensure the base URL includes /api exactly once
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_URL = getBaseApiUrl();

const handleFetchError = (err: any): never => {
  if (err?.message === 'Failed to fetch') {
    const errorMsg = import.meta.env.PROD
      ? 'Could not connect to the backend server. Please verify the live backend service is active.'
      : 'Could not connect to the backend server. Is Flask running on port 5000?';
    throw new Error(errorMsg);
  }
  throw err;
};

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getDashboardSummary(params?: any) {
    try {
      const query = new URLSearchParams(params || {}).toString();
      const res = await fetch(`${API_URL}/dashboard/summary?${query}`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getCanonicalFields() {
    try {
      const res = await fetch(`${API_URL}/imports/canonical-fields`);
      if (!res.ok) throw new Error('Failed to fetch canonical fields');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
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
      handleFetchError(err);
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
      handleFetchError(err);
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
      handleFetchError(err);
    }
  },

  async getImportHistory() {
    try {
      const res = await fetch(`${API_URL}/imports/history`);
      if (!res.ok) throw new Error('Failed to fetch import history');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getStudents(params?: any) {
    try {
      const query = new URLSearchParams(params || {}).toString();
      const res = await fetch(`${API_URL}/students/?${query}`);
      if (!res.ok) throw new Error('Failed to fetch students');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getStudent(id: string) {
    try {
      const res = await fetch(`${API_URL}/students/${id}`);
      if (!res.ok) throw new Error('Failed to fetch student details');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getStudentBrief(id: string) {
    try {
      const res = await fetch(`${API_URL}/students/${id}/brief`);
      if (!res.ok) throw new Error('Failed to fetch student AI brief');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getReport(type: string, params?: any) {
    try {
      const query = new URLSearchParams(params || {}).toString();
      const res = await fetch(`${API_URL}/${type}?${query}`);
      if (!res.ok) throw new Error(`Failed to fetch ${type} report`);
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getReportInsights(params?: any) {
    try {
      const query = new URLSearchParams(params || {}).toString();
      const res = await fetch(`${API_URL}/reports/insights?${query}`);
      if (!res.ok) throw new Error('Failed to fetch report insights');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
    }
  },

  async getInterventions() {
    try {
      const res = await fetch(`${API_URL}/interventions/`);
      if (!res.ok) throw new Error('Failed to fetch interventions');
      return await res.json();
    } catch (err: any) {
      handleFetchError(err);
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
      handleFetchError(err);
    }
  }
};
