import React, { useState, useEffect, useMemo } from 'react';
import { 
  UploadCloud, CheckCircle2, AlertCircle, AlertTriangle, 
  Download, Loader2, ArrowRight, ArrowLeft, Layers, 
  ShieldCheck, Database, Check, FileSpreadsheet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { invalidateAllQueries } from '../hooks/useQuery';

type MappingItem = {
  canonical_field: string | null;
  confidence: number;
  detected_type: string;
  is_conflict: boolean;
  is_legacy: boolean;
  reason?: string;
};

type Step = 'upload' | 'mapping' | 'validation' | 'processing' | 'summary';

export default function DataHub() {

  // Wizard Step
  const [currentStep, setCurrentStep] = useState<Step>('upload');

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Canonical Schema List
  const [canonicalFields, setCanonicalFields] = useState<any[]>([]);

  // User-defined Column Mapping: { [rawCol]: canonicalFieldKey | '' }
  const [userMapping, setUserMapping] = useState<Record<string, string>>({});

  // Validation State
  const [validationReport, setValidationReport] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [importMode, setImportMode] = useState<'upsert' | 'insert_only'>('upsert');
  const [allowPartial, setAllowPartial] = useState(true);

  // Processing & Summary State
  const [processingStage, setProcessingStage] = useState<string>('');
  const [importSummary, setImportSummary] = useState<any>(null);

  // Load Canonical Fields on mount
  useEffect(() => {
    api.getCanonicalFields()
      .then(res => {
        if (res.fields) setCanonicalFields(res.fields);
      })
      .catch(err => console.error('Could not load canonical fields:', err));
  }, []);

  // When a file is selected, parse preview
  useEffect(() => {
    if (selectedFile) {
      handlePreview(selectedFile);
    }
  }, [selectedFile]);

  const handlePreview = async (file: File) => {
    setLoading(true);
    setError(null);
    setImportSummary(null);
    try {
      const data = await api.previewImport(file);
      setPreviewData(data);
      if (data.canonical_fields) {
        setCanonicalFields(data.canonical_fields);
      }

      // Initialize mapping from proposed mappings
      const initialMap: Record<string, string> = {};
      if (data.proposed_mappings) {
        Object.entries(data.proposed_mappings).forEach(([col, prop]: [string, any]) => {
          if (!prop.is_legacy && prop.canonical_field) {
            initialMap[col] = prop.canonical_field;
          } else {
            initialMap[col] = '';
          }
        });
      }
      setUserMapping(initialMap);
      setCurrentStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
      setPreviewData(null);
      setCurrentStep('upload');
    } finally {
      setLoading(false);
    }
  };

  // Group canonical fields by category for the select dropdown
  const groupedFields = useMemo(() => {
    const groups: Record<string, any[]> = {};
    canonicalFields.forEach(f => {
      const cat = f.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });
    return groups;
  }, [canonicalFields]);

  // Identify mapping conflicts: two raw columns mapped to the same canonical field
  const mappingConflicts = useMemo(() => {
    const counts: Record<string, string[]> = {};
    Object.entries(userMapping).forEach(([col, canon]) => {
      if (canon) {
        if (!counts[canon]) counts[canon] = [];
        counts[canon].push(col);
      }
    });

    const conflicts: Record<string, string[]> = {};
    Object.entries(counts).forEach(([canon, cols]) => {
      if (cols.length > 1) {
        conflicts[canon] = cols;
      }
    });
    return conflicts;
  }, [userMapping]);

  // Check required mappings
  const hasIdMapping = useMemo(() => {
    return Object.values(userMapping).includes('student_id');
  }, [userMapping]);

  const hasNameMapping = useMemo(() => {
    return Object.values(userMapping).includes('student_name');
  }, [userMapping]);

  // Handle Mapping Change
  const handleMappingChange = (rawCol: string, canonicalKey: string) => {
    setUserMapping(prev => ({
      ...prev,
      [rawCol]: canonicalKey
    }));
  };

  // Run Pre-Commit Validation
  const handleProceedToValidation = async () => {
    if (!previewData?.preview_id) return;
    setValidating(true);
    setError(null);
    try {
      const res = await api.validateImport(previewData.preview_id, userMapping, importMode);
      setValidationReport(res.report);
      setCurrentStep('validation');
    } catch (err: any) {
      setError(err.message || 'Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  // Re-run validation when mode changes
  const handleModeChange = async (newMode: 'upsert' | 'insert_only') => {
    setImportMode(newMode);
    if (previewData?.preview_id && currentStep === 'validation') {
      try {
        const res = await api.validateImport(previewData.preview_id, userMapping, newMode);
        setValidationReport(res.report);
      } catch (err) {
        console.error('Mode change validation failed', err);
      }
    }
  };

  // Execute Final Commit with Pre-calculation
  const handleExecuteImport = async () => {
    if (!previewData?.preview_id) return;
    setCurrentStep('processing');
    setProcessingStage('Normalizing records and applying dynamic mappings...');
    setError(null);

    try {
      setTimeout(() => {
        setProcessingStage('Pre-calculating Student Success Scores and risk flags...');
      }, 500);

      setTimeout(() => {
        setProcessingStage('Committing verified records to Supabase database...');
      }, 1000);

      const summary = await api.confirmImport(
        previewData.preview_id,
        userMapping,
        importMode,
        allowPartial
      );

      // Invalidate frontend query caches so all pages refresh immediately!
      invalidateAllQueries();

      setImportSummary(summary);
      setCurrentStep('summary');
    } catch (err: any) {
      setError(err.message || 'Failed to complete import.');
      setCurrentStep('validation');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setUserMapping({});
    setValidationReport(null);
    setImportSummary(null);
    setError(null);
    setCurrentStep('upload');
  };

  const handleDownloadSample = () => {
    const csvContent = 
      "Roll Number,Student Name,Department,Semester,Year,Cumulative GPA,Active Backlogs,Attendance %,Assignment %,LMS Logins,Coding Score,Aptitude Score,Mock Interview Score\n" +
      "STU0501,Aditi Sharma,Computer Science Dept,6,3,8.75,0,88.5,92.0,54,85.0,78.0,82.0\n" +
      "STU0502,Rohan Mehta,Business Dept,4,2,5.20,2,55.0,48.0,18,42.0,50.0,45.0\n" +
      "STU0503,Priya Sen,Mechanical Dept,8,4,7.40,0,76.0,80.0,32,68.0,72.0,70.0\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'StudentArc_Smart_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = () => {
    if (!validationReport && !importSummary) return;
    const reportData = {
      filename: selectedFile?.name || 'imported_dataset',
      summary: importSummary,
      validation: validationReport,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `StudentArc_Import_Report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold text-text-main tracking-tight">Smart Data Import</h2>
          <p className="mt-1 text-[13px] text-text-muted max-w-2xl">
            Intelligently profile, dynamically map, validate, and pre-calculate student success analytics from any institutional CSV.
          </p>
        </div>
        <button 
          onClick={handleDownloadSample}
          className="inline-flex items-center self-start sm:self-auto px-3.5 py-2 text-[13px] font-medium rounded-lg text-text-main bg-card border border-card-border hover:bg-surface transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 mr-2 text-text-muted" />
          Download Sample CSV
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-card border border-card-border rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { id: 'upload', label: '1. Select & Profile' },
            { id: 'mapping', label: '2. Column Mapping' },
            { id: 'validation', label: '3. Data Validation' },
            { id: 'summary', label: '4. Calculation & Summary' }
          ].map((st, i) => {
            const isActive = currentStep === st.id || (st.id === 'summary' && currentStep === 'processing');
            const isCompleted = 
              (st.id === 'upload' && currentStep !== 'upload') ||
              (st.id === 'mapping' && (currentStep === 'validation' || currentStep === 'processing' || currentStep === 'summary')) ||
              (st.id === 'validation' && (currentStep === 'processing' || currentStep === 'summary'));

            return (
              <div key={st.id} className="flex items-center space-x-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                  isCompleted 
                    ? 'bg-[#172B4D] text-white' 
                    : isActive 
                    ? 'bg-[#F47735] text-white ring-4 ring-[#FFB080]/30' 
                    : 'bg-surface text-text-muted border border-card-border'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[12px] font-medium hidden sm:inline ${
                  isActive ? 'text-text-main font-semibold' : 'text-text-muted'
                }`}>
                  {st.label}
                </span>
                {i < 3 && <div className="w-6 lg:w-12 h-px bg-card-border mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[12px] flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-[13px] text-red-800">
            <strong>Import Error:</strong> {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 text-[13px]">&times;</button>
        </div>
      )}

      {/* STEP 1: UPLOAD & FILE PROFILING */}
      {currentStep === 'upload' && (
        <div className="bg-card rounded-[16px] border border-card-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
          <div>
            <h3 className="text-[16px] font-semibold text-text-main">Choose CSV or Excel Dataset</h3>
            <p className="text-[13px] text-text-muted mt-1">
              Supports standard UTF-8 CSVs, UTF-8 with BOM, semicolons, tabs, and Excel files (.xlsx).
            </p>
          </div>

          <div 
            className={`flex justify-center rounded-[12px] border-2 border-dashed px-6 py-16 transition-all ${
              dragActive ? 'border-[#172B4D] bg-[#F4F5F7]' : 'border-card-border bg-[#F4F5F7]/40 hover:bg-[#F4F5F7]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-[#8793A5]" strokeWidth={1.5} />
              <div className="mt-4 flex text-[14px] leading-6 text-text-muted justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded font-semibold text-[#172B4D] hover:underline"
                >
                  <span>Select CSV File</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv, .xlsx" onChange={handleFileChange} />
                </label>
                <p className="pl-1.5">or drag and drop into this window</p>
              </div>
              <p className="text-[12px] text-text-muted mt-1">Automatic delimiter & column normalization</p>
            </div>
          </div>

          {loading && (
            <div className="p-6 bg-surface rounded-[12px] border border-card-border flex items-center justify-center space-x-3 text-[13px] text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin text-[#172B4D]" />
              <span>Analyzing file structure, sniffing delimiters, and inferring column mappings...</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: DYNAMIC COLUMN MAPPING */}
      {currentStep === 'mapping' && previewData && (
        <div className="bg-card rounded-[16px] border border-card-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-card-border">
            <div>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-[#172B4D]" />
                <h3 className="text-[16px] font-semibold text-text-main">{previewData.filename}</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface border border-card-border text-text-muted">
                  {previewData.total_rows} rows detected
                </span>
              </div>
              <p className="text-[13px] text-text-muted mt-1">
                Review and adjust how source columns map to StudentArc's canonical fields. Required fields are marked with an asterisk (*).
              </p>
            </div>
            <button 
              onClick={handleReset}
              className="text-[13px] text-text-muted hover:text-text-main transition-colors"
            >
              Choose different file
            </button>
          </div>

          {/* Conflict Alert Banner */}
          {Object.keys(mappingConflicts).length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-[12px] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-[13px] text-amber-900">
                <strong>Mapping Conflict Detected:</strong> Multiple columns are mapped to the same canonical field:
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {Object.entries(mappingConflicts).map(([canon, cols]) => (
                    <li key={canon}>
                      Field <strong>{canon}</strong> is claimed by: {cols.join(', ')}. Please assign one to another field or select <em>[Skip / Ignore]</em>.
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Missing Required Mapping Warning */}
          {(!hasIdMapping || !hasNameMapping) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Required Mappings Missing:</strong> {!hasIdMapping ? 'Student ID (*) ' : ''} {!hasNameMapping ? 'Student Name (*) ' : ''} must be mapped before proceeding.
              </span>
            </div>
          )}

          {/* Mapping Table */}
          <div className="overflow-x-auto rounded-[12px] border border-card-border overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface border-b border-card-border text-text-muted font-medium">
                <tr>
                  <th className="py-2.5 px-4">Source CSV Column</th>
                  <th className="py-2.5 px-4">Sample Values</th>
                  <th className="py-2.5 px-4">Detected Type</th>
                  <th className="py-2.5 px-4">Mapped Canonical Field</th>
                  <th className="py-2.5 px-4 text-center">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {previewData.columns.map((col: string) => {
                  const prop = previewData.proposed_mappings?.[col] as MappingItem | undefined;
                  const currentMapped = userMapping[col] || '';
                  const isConflict = currentMapped && (mappingConflicts[currentMapped]?.length || 0) > 1;
                  const isLegacy = prop?.is_legacy;

                  // Get first 3 sample values
                  const sampleVals = (previewData.preview_data || [])
                    .slice(0, 3)
                    .map((r: any) => r[col])
                    .filter((v: any) => v != null)
                    .map((v: any) => String(v));

                  return (
                    <tr key={col} className={`hover:bg-surface/50 transition-colors ${isConflict ? 'bg-amber-50/40' : ''}`}>
                      <td className="py-2.5 px-4 font-medium text-text-main">
                        {col}
                        {isLegacy && (
                          <span className="ml-2 text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded">Legacy</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-text-muted max-w-xs truncate font-mono text-[11px]">
                        {sampleVals.length > 0 ? sampleVals.join(', ') : '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-card-border text-text-muted capitalize">
                          {prop?.detected_type || 'string'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={currentMapped}
                          onChange={(e) => handleMappingChange(col, e.target.value)}
                          className={`w-full max-w-xs px-2.5 py-1.5 rounded-lg border text-[12px] font-medium bg-card focus:outline-none focus:ring-1 transition-all ${
                            isConflict 
                              ? 'border-amber-400 ring-amber-400 bg-amber-50' 
                              : currentMapped 
                              ? 'border-[#172B4D] text-[#172B4D]' 
                              : 'border-card-border text-text-muted'
                          }`}
                        >
                          <option value="">[ Skip / Do Not Import ]</option>
                          {Object.entries(groupedFields).map(([cat, fields]) => (
                            <optgroup key={cat} label={`── ${cat} ──`}>
                              {fields.map((f: any) => (
                                <option key={f.key} value={f.key}>
                                  {f.label} {f.required ? '(*)' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {prop?.confidence && prop.confidence >= 0.8 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            High ({(prop.confidence * 100).toFixed(0)}%)
                          </span>
                        ) : prop?.confidence && prop.confidence > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Medium ({(prop.confidence * 100).toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface text-text-muted border border-card-border">
                            Manual
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-card-border">
            <button
              onClick={() => setCurrentStep('upload')}
              className="inline-flex items-center px-4 py-2 border border-card-border text-[13px] font-medium rounded-lg text-text-main bg-card hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </button>
            <button
              onClick={handleProceedToValidation}
              disabled={validating || !hasIdMapping || Object.keys(mappingConflicts).length > 0}
              className={`inline-flex items-center px-5 py-2 text-[13px] font-medium rounded-lg text-white transition-opacity ${
                validating || !hasIdMapping || Object.keys(mappingConflicts).length > 0
                  ? 'bg-zinc-400 cursor-not-allowed opacity-60'
                  : 'bg-[#172B4D] hover:opacity-90 shadow-sm'
              }`}
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating dataset...
                </>
              ) : (
                <>
                  Verify & Check Data Quality
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: VALIDATION & DATA QUALITY REPORT */}
      {currentStep === 'validation' && validationReport && (
        <div className="bg-card rounded-[16px] border border-card-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-card-border">
            <div>
              <h3 className="text-[16px] font-semibold text-text-main">Data Quality & Pre-Commit Audit</h3>
              <p className="text-[13px] text-text-muted mt-1">
                Verified ranges, student identities, duplicate keys, and missing indicator coverage.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep('mapping')}
              className="inline-flex items-center text-[13px] text-text-muted hover:text-text-main transition-colors"
            >
              Adjust Column Mappings
            </button>
          </div>

          {/* Stats KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-surface rounded-[12px] border border-card-border">
              <p className="text-[12px] text-text-muted">Total Rows Read</p>
              <p className="text-[20px] font-semibold text-text-main mt-0.5">{validationReport.total_rows}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-[12px] border border-emerald-200">
              <p className="text-[12px] text-emerald-800">Valid Rows</p>
              <p className="text-[20px] font-semibold text-emerald-900 mt-0.5">{validationReport.valid_rows}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-[12px] border border-blue-200">
              <p className="text-[12px] text-blue-800">New Students</p>
              <p className="text-[20px] font-semibold text-blue-900 mt-0.5">{validationReport.new_students_count}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-[12px] border border-amber-200">
              <p className="text-[12px] text-amber-800">Existing (Updates)</p>
              <p className="text-[20px] font-semibold text-amber-900 mt-0.5">{validationReport.existing_students_count}</p>
            </div>
          </div>

          {/* Import Mode Selection */}
          <div className="p-5 bg-surface rounded-[12px] border border-card-border space-y-3">
            <h4 className="text-[14px] font-semibold text-text-main flex items-center gap-2">
              <Database className="w-4 h-4 text-[#172B4D]" /> Select Commit Mode
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className={`p-3.5 rounded-[10px] border cursor-pointer flex items-start space-x-3 transition-colors ${
                  importMode === 'upsert' ? 'bg-card border-[#172B4D] ring-1 ring-[#172B4D]' : 'bg-card border-card-border hover:bg-surface'
                }`}
              >
                <input 
                  type="radio" 
                  name="importMode" 
                  checked={importMode === 'upsert'} 
                  onChange={() => handleModeChange('upsert')}
                  className="mt-1 text-[#172B4D]" 
                />
                <div>
                  <p className="text-[13px] font-semibold text-text-main">Update & Add (Upsert Mode) <span className="text-[11px] font-normal text-[#F47735] ml-1">(Recommended)</span></p>
                  <p className="text-[12px] text-text-muted mt-0.5">
                    Updates existing student records that share the same ID, and adds new students.
                  </p>
                </div>
              </label>

              <label 
                className={`p-3.5 rounded-[10px] border cursor-pointer flex items-start space-x-3 transition-colors ${
                  importMode === 'insert_only' ? 'bg-card border-[#172B4D] ring-1 ring-[#172B4D]' : 'bg-card border-card-border hover:bg-surface'
                }`}
              >
                <input 
                  type="radio" 
                  name="importMode" 
                  checked={importMode === 'insert_only'} 
                  onChange={() => handleModeChange('insert_only')}
                  className="mt-1 text-[#172B4D]" 
                />
                <div>
                  <p className="text-[13px] font-semibold text-text-main">Insert Only (Skip Existing)</p>
                  <p className="text-[12px] text-text-muted mt-0.5">
                    Only inserts new student IDs. Preserves existing student data untouched.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="allowPartial" 
                checked={allowPartial} 
                onChange={e => setAllowPartial(e.target.checked)}
                className="rounded text-[#172B4D]" 
              />
              <label htmlFor="allowPartial" className="text-[12px] text-text-main cursor-pointer">
                Permit partial import (safely commit valid rows while rejecting invalid rows)
              </label>
            </div>
          </div>

          {/* Missing Indicators Coverage */}
          {validationReport.missing_canonical && validationReport.missing_canonical.length > 0 && (
            <div className="p-4 bg-surface rounded-[12px] border border-card-border">
              <p className="text-[13px] font-semibold text-text-main flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#8793A5]" />
                Unsupplied Canonical Indicators ({validationReport.missing_canonical.length})
              </p>
              <p className="text-[12px] text-text-muted mt-1">
                The scoring engine dynamically redistributes weights so students are not penalized for missing indicators:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {validationReport.missing_canonical.map((field: string) => (
                  <span key={field} className="px-2 py-0.5 rounded-full text-[11px] bg-card border border-card-border text-text-muted font-mono">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Row-Level Issues Table (if any) */}
          {validationReport.issues && validationReport.issues.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-[14px] font-semibold text-text-main flex items-center justify-between">
                <span>Row-Level Validation Notices ({validationReport.total_issues_count})</span>
                <span className="text-[12px] text-text-muted font-normal">Showing first {validationReport.issues.length} notices</span>
              </h4>
              <div className="overflow-x-auto rounded-[12px] border border-card-border max-h-60 overflow-y-auto overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-surface border-b border-card-border text-text-muted sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row #</th>
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Value</th>
                      <th className="py-2 px-3">Notice / Reason</th>
                      <th className="py-2 px-3">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border font-mono">
                    {validationReport.issues.map((iss: any, i: number) => (
                      <tr key={i} className="hover:bg-surface/50">
                        <td className="py-1.5 px-3 font-semibold text-text-main">{iss.row || 'Schema'}</td>
                        <td className="py-1.5 px-3 text-text-muted">{iss.field}</td>
                        <td className="py-1.5 px-3 text-text-muted truncate max-w-xs">{String(iss.value ?? '—')}</td>
                        <td className="py-1.5 px-3 font-sans text-text-main">{iss.reason}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            iss.severity === 'critical' || iss.severity === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {iss.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[12px] flex items-center space-x-2 text-[13px] text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>All rows passed verification with 0 range or identity issues!</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-card-border">
            <button
              onClick={() => setCurrentStep('mapping')}
              className="inline-flex items-center px-4 py-2 border border-card-border text-[13px] font-medium rounded-lg text-text-main bg-card hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Mapping
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={validationReport.has_critical_error || (!allowPartial && validationReport.invalid_rows > 0)}
              className="inline-flex items-center px-6 py-2.5 text-[13px] font-medium rounded-lg text-white bg-[#172B4D] hover:opacity-90 shadow-sm transition-opacity"
            >
              Pre-Calculate Scores & Commit Dataset
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PROCESSING & PRE-CALCULATION PROGRESS */}
      {currentStep === 'processing' && (
        <div className="bg-card rounded-[16px] border border-card-border p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <Loader2 className="w-12 h-12 text-[#172B4D] animate-spin mx-auto" />
          <h3 className="text-[18px] font-semibold text-text-main">Processing Dataset</h3>
          <p className="text-[13px] text-text-muted max-w-md mx-auto">{processingStage}</p>
        </div>
      )}

      {/* STEP 5: COMPLETION SUMMARY & NAVIGATION */}
      {currentStep === 'summary' && importSummary && (
        <div className="bg-card rounded-[16px] border border-card-border p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-[22px] font-semibold text-text-main">Import & Pre-Calculation Completed!</h3>
            <p className="text-[13px] text-text-muted max-w-lg mx-auto">
              StudentArc has successfully normalized your CSV, pre-calculated Success Scores & Risk Flags, and refreshed the application data.
            </p>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-card-border">
            <div className="p-4 bg-surface rounded-[12px] border border-card-border text-center">
              <p className="text-[12px] text-text-muted">Total Rows Read</p>
              <p className="text-[22px] font-bold text-text-main mt-0.5">{importSummary.rows_read}</p>
            </div>
            <div className="p-4 bg-surface rounded-[12px] border border-card-border text-center">
              <p className="text-[12px] text-emerald-700 font-medium">Rows Inserted</p>
              <p className="text-[22px] font-bold text-emerald-700 mt-0.5">{importSummary.rows_inserted}</p>
            </div>
            <div className="p-4 bg-surface rounded-[12px] border border-card-border text-center">
              <p className="text-[12px] text-blue-700 font-medium">Rows Updated</p>
              <p className="text-[22px] font-bold text-blue-700 mt-0.5">{importSummary.rows_updated}</p>
            </div>
            <div className="p-4 bg-surface rounded-[12px] border border-card-border text-center">
              <p className="text-[12px] text-text-muted">Processing Time</p>
              <p className="text-[22px] font-bold text-text-main mt-0.5">{importSummary.duration_ms} ms</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-card-border">
            <button
              onClick={handleDownloadReport}
              className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-medium border border-card-border rounded-lg text-text-main bg-card hover:bg-surface transition-colors flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2 text-text-muted" />
              Download Audit Report (.json)
            </button>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-medium border border-card-border rounded-lg text-text-main bg-card hover:bg-surface transition-colors"
            >
              Import Another Dataset
            </button>
            <Link
              to="/students"
              className="w-full sm:w-auto px-5 py-2.5 text-[13px] font-medium rounded-lg text-text-main bg-surface border border-card-border hover:bg-card transition-colors flex items-center justify-center"
            >
              View Student Directory
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-2.5 text-[13px] font-medium rounded-lg text-white bg-[#172B4D] hover:opacity-90 shadow-sm transition-opacity flex items-center justify-center"
            >
              Open Updated Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
