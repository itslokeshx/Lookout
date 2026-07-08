import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, Loader2, Database, ArrowRight, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import {
  getDatabases,
  getCollections,
  getSample,
  suggestMapping,
  checkJoin,
  saveSettings,
} from '../api';

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none transition-all duration-200 focus:border-border-strong focus:bg-surface-hover appearance-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-tertiary">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, helper }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-200 focus:border-border-strong focus:bg-surface-hover"
      />
      {helper && <p className="text-[11px] text-text-tertiary">{helper}</p>}
    </div>
  );
}

export default function SetupView({ existingSettings, onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [databases, setDatabases] = useState([]);
  const [collections, setCollections] = useState([]);
  const [primaryFields, setPrimaryFields] = useState([]);
  const [secondaryFields, setSecondaryFields] = useState([]);

  // Connection count state
  const [numCollections, setNumCollections] = useState(existingSettings?.enrichment?.collection ? 2 : 1);

  const [dbName, setDbName] = useState(existingSettings?.db_name || '');
  const [collectionName, setCollectionName] = useState(existingSettings?.collection_name || '');
  const [productName, setProductName] = useState(existingSettings?.product_name || '');

  const [fieldMapping, setFieldMapping] = useState(existingSettings?.field_mapping || {
    email: '', name: '', joined_date: '', last_active: '',
  });

  // Combined custom fields state
  const [customFields, setCustomFields] = useState(() => {
    const list = [];
    const existingMetrics = existingSettings?.metrics || [];
    existingMetrics.forEach((m) => {
      list.push({ field: m.field || '', label: m.label || '', unit: m.unit || '' });
    });
    const existingExtras = existingSettings?.extra_fields || [];
    existingExtras.forEach((f) => {
      if (!existingMetrics.some((m) => m.field === f)) {
        list.push({ field: f, label: '', unit: '' });
      }
    });
    // Ensure at least 2 entries so there are 6 fields shown in total (4 core + 2 custom)
    while (list.length < 2) {
      list.push({ field: '', label: '', unit: '' });
    }
    return list;
  });

  const handleCustomFieldChange = (index, key, value) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [key]: value };
    setCustomFields(updated);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { field: '', label: '', unit: '' }]);
  };

  const removeCustomField = (index) => {
    if (customFields.length > 2) {
      setCustomFields(customFields.filter((_, i) => i !== index));
    } else {
      const updated = [...customFields];
      updated[index] = { field: '', label: '', unit: '' };
      setCustomFields(updated);
    }
  };

  // Suggestions state
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  // Sender details
  const [senderName, setSenderName] = useState(existingSettings?.sender_name || '');
  const [senderEmail, setSenderEmail] = useState(existingSettings?.sender_email || '');

  // Enrichment
  const [enrichment, setEnrichment] = useState(existingSettings?.enrichment || {
    collection: '', local_key: '', foreign_key: '', relationship: 'one-to-one',
    sort_field: null, sort_ascending: false, reason: '',
  });
  const [joinCheckResult, setJoinCheckResult] = useState(null);

  // Dynamic Steps
  const STEPS = ['Database', 'Fields', 'Sender'];

  useEffect(() => {
    getDatabases().then((d) => setDatabases(d.databases)).catch(() => {});
  }, []);

  useEffect(() => {
    if (dbName) {
      getCollections(dbName).then((d) => setCollections(d.collections)).catch(() => {});
    }
  }, [dbName]);

  useEffect(() => {
    let active = true;
    if (!dbName || !collectionName) {
      setPrimaryFields([]);
      return;
    }
    getSample(dbName, collectionName).then((d) => {
      if (active) setPrimaryFields(d.fields || []);
    }).catch(() => {});
    return () => { active = false; };
  }, [dbName, collectionName]);

  useEffect(() => {
    let active = true;
    if (!dbName || !enrichment.collection || numCollections !== 2) {
      setSecondaryFields([]);
      return;
    }
    getSample(dbName, enrichment.collection).then((d) => {
      if (active) setSecondaryFields(d.fields || []);
    }).catch(() => {});
    return () => { active = false; };
  }, [dbName, enrichment.collection, numCollections]);

  const primaryFieldNames = primaryFields.map((f) => f.name);
  const secondaryFieldNames = secondaryFields.map((f) => f.name);
  const fieldNames = Array.from(new Set([...primaryFieldNames, ...secondaryFieldNames]));

  const handleSuggest = async () => {
    setSuggestionLoading(true);
    setError(null);
    try {
      const result = await suggestMapping(
        dbName,
        collectionName,
        numCollections === 2 && enrichment.collection ? enrichment.collection : null,
      );
      setFieldMapping({
        email: result.fields.email_field || '',
        name: result.fields.name_field || '',
        joined_date: result.fields.joined_date_field || '',
        last_active: result.fields.last_active_field || '',
      });

      // Unify suggestions into customFields list
      const suggestedList = [];
      const suggestedMetrics = result.metrics || [];
      suggestedMetrics.forEach((m) => {
        suggestedList.push({ field: m.field || '', label: m.label || '', unit: m.unit || '' });
      });
      const suggestedExtras = result.extra_fields || [];
      suggestedExtras.forEach((f) => {
        if (!suggestedMetrics.some((m) => m.field === f)) {
          suggestedList.push({ field: f, label: '', unit: '' });
        }
      });
      // Pad to at least 2 custom fields
      while (suggestedList.length < 2) {
        suggestedList.push({ field: '', label: '', unit: '' });
      }
      setCustomFields(suggestedList);

      if (result.join && numCollections === 2) {
        setEnrichment((prev) => ({
          ...prev,
          local_key: result.join.local_key || '',
          foreign_key: result.join.foreign_key || '',
          reason: result.join.reason || '',
        }));
      }
      setSuggestionApplied(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleCheckJoin = async () => {
    if (!enrichment.local_key || !enrichment.foreign_key) return;
    setLoading(true);
    try {
      const result = await checkJoin(
        dbName, collectionName, enrichment.collection,
        enrichment.local_key, enrichment.foreign_key,
      );
      setJoinCheckResult(result);
      setEnrichment((prev) => ({ ...prev, relationship: result.relationship }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const finalMetrics = [];
      const finalExtras = [];

      customFields.forEach((cf) => {
        const fieldName = cf.field?.trim();
        if (!fieldName) return;

        finalExtras.push(fieldName);

        if (cf.label?.trim() || cf.unit?.trim()) {
          finalMetrics.push({
            field: fieldName,
            label: cf.label.trim() || fieldName,
            unit: cf.unit.trim() || '',
          });
        }
      });

      await saveSettings({
        db_name: dbName,
        collection_name: collectionName,
        field_mapping: fieldMapping,
        metrics: finalMetrics,
        extra_fields: finalExtras,
        sender_name: senderName,
        sender_email: senderEmail,
        product_name: productName,
        enrichment: numCollections === 2 ? enrichment : null,
      });
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildSchemaPreviewJson = () => {
    const preview = {};
    if (fieldMapping.email) preview["email"] = `user.${fieldMapping.email} (e.g. "alex@domain.com")`;
    if (fieldMapping.name) preview["name"] = `user.${fieldMapping.name} (e.g. "Alex")`;
    if (fieldMapping.joined_date) preview["joined_date"] = `user.${fieldMapping.joined_date} (e.g. "2026-07-08")`;
    if (fieldMapping.last_active) preview["last_active"] = `user.${fieldMapping.last_active} (e.g. "2026-07-08")`;

    customFields.forEach(cf => {
      if (cf.field?.trim()) {
        const key = cf.field.trim();
        const label = cf.label?.trim() || key;
        const unit = cf.unit?.trim() ? ` in ${cf.unit.trim()}` : '';
        preview[key] = `user.${key} (Label: "${label}"${unit})`;
      }
    });

    return JSON.stringify(preview, null, 2);
  };

  const canProceedStep0 = dbName && collectionName && (numCollections === 1 || (enrichment.collection && enrichment.local_key && enrichment.foreign_key));
  const canProceedStep1 = fieldMapping.name || fieldMapping.email;
  const canProceedStep2 = senderName && senderEmail;

  return (
    <div className="max-w-5xl mx-auto pt-8 pb-16 px-6 animate-slide-up">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            {existingSettings?.setup_complete ? 'Settings' : 'Setup'}
          </h1>
          <p className="text-sm text-text-tertiary mt-1">
            {existingSettings?.setup_complete
              ? 'Update your database connection, field mappings, and sender details.'
              : 'Connect your database and configure LookOut for your product.'}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium transition-all duration-200 ${
              i < step
                ? 'bg-accent text-surface'
                : i === step
                  ? 'bg-accent-muted text-accent border border-accent/30'
                  : 'bg-surface-raised text-text-tertiary border border-border'
            }`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${
              i <= step ? 'text-text-secondary' : 'text-text-tertiary'
            }`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight size={12} className="text-text-tertiary mx-1" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 mb-6">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-6 animate-slide-up">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-accent" />
            <span className="text-sm font-medium text-text-primary">Database & Collections</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Data Source</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNumCollections(1)}
                className={`py-3.5 px-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  numCollections === 1
                    ? 'border-accent bg-accent-muted'
                    : 'border-border bg-surface-raised hover:bg-surface-hover'
                }`}
              >
                <span className={`text-sm font-medium block ${numCollections === 1 ? 'text-accent' : 'text-text-secondary'}`}>Single Collection</span>
                <span className="text-[11px] text-text-tertiary mt-0.5 block">All user data in one collection</span>
              </button>
              <button
                type="button"
                onClick={() => setNumCollections(2)}
                className={`py-3.5 px-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  numCollections === 2
                    ? 'border-accent bg-accent-muted'
                    : 'border-border bg-surface-raised hover:bg-surface-hover'
                }`}
              >
                <span className={`text-sm font-medium block ${numCollections === 2 ? 'text-accent' : 'text-text-secondary'}`}>Two Collections</span>
                <span className="text-[11px] text-text-tertiary mt-0.5 block">Join user data with related records</span>
              </button>
            </div>
          </div>

          <SelectField
            label="Database"
            value={dbName}
            onChange={(v) => { setDbName(v); setCollectionName(''); setSampleFields([]); }}
            options={databases}
            placeholder="Select a database"
          />

          {dbName && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Primary Collection (Users)"
                value={collectionName}
                onChange={setCollectionName}
                options={collections}
                placeholder="Select primary collection"
              />
              {numCollections === 2 && (
                <SelectField
                  label="Secondary Collection (Enrichment)"
                  value={enrichment.collection}
                  onChange={(v) => setEnrichment({ ...enrichment, collection: v })}
                  options={collections.filter(c => c !== collectionName)}
                  placeholder="Select secondary collection"
                />
              )}
            </div>
          )}

          {numCollections === 2 && enrichment.collection && (
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Visual connection header */}
              <div className="bg-surface-raised px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Join Configuration</span>
                  {joinCheckResult && joinCheckResult.match_count > 0 && (
                    <span className="text-[10px] font-semibold text-success uppercase tracking-wider">● Connected</span>
                  )}
                </div>
                {/* Visual flow diagram */}
                <div className="flex items-center gap-3 mt-3 px-1">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-center">
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Primary</p>
                    <p className="text-xs font-semibold text-text-primary mt-0.5 truncate">{collectionName}</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <ArrowRight size={14} className="text-accent" />
                    <span className="text-[9px] text-text-tertiary">JOIN</span>
                  </div>
                  <div className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-center">
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Secondary</p>
                    <p className="text-xs font-semibold text-text-primary mt-0.5 truncate">{enrichment.collection}</p>
                  </div>
                </div>
              </div>

              {/* Join keys */}
              <div className="px-5 py-4 space-y-4">
                <p className="text-[11px] text-text-tertiary">Select the fields that link these collections (e.g. a shared user ID or username).</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label={`Key in ${collectionName}`} value={enrichment.local_key} onChange={(v) => { setEnrichment({ ...enrichment, local_key: v }); setJoinCheckResult(null); }} options={primaryFieldNames} placeholder="Select key" />
                  <SelectField label={`Key in ${enrichment.collection}`} value={enrichment.foreign_key} onChange={(v) => { setEnrichment({ ...enrichment, foreign_key: v }); setJoinCheckResult(null); }} options={secondaryFieldNames} placeholder="Select key" />
                </div>

                {enrichment.reason && (
                  <div className="rounded-lg border border-accent/20 bg-accent-muted/50 px-3 py-2">
                    <p className="text-xs text-accent">💡 AI suggestion: {enrichment.reason}</p>
                  </div>
                )}

                {enrichment.local_key && enrichment.foreign_key && !joinCheckResult && (
                  <button type="button" onClick={handleCheckJoin} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-surface hover:bg-accent-hover transition-all duration-150 cursor-pointer disabled:opacity-50">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                    Verify Connection
                  </button>
                )}

                {joinCheckResult && (
                  <div className={`rounded-lg border px-4 py-3 ${
                    joinCheckResult.match_count === 0
                      ? 'border-error/20 bg-error/5'
                      : joinCheckResult.relationship === 'one-to-many'
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-success/30 bg-success/5'
                  }`}>
                    {joinCheckResult.match_count === 0 ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={13} className="text-error mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-error">No matches found</p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">Ensure both keys contain matching values (e.g., both reference the same user identifier).</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <Check size={13} className={`mt-0.5 shrink-0 ${joinCheckResult.relationship === 'one-to-many' ? 'text-warning' : 'text-success'}`} />
                        <div>
                          <p className={`text-xs font-semibold ${joinCheckResult.relationship === 'one-to-many' ? 'text-warning' : 'text-success'}`}>
                            Connected — {joinCheckResult.match_count} match{joinCheckResult.match_count !== 1 ? 'es' : ''} ({joinCheckResult.relationship})
                          </p>
                          {joinCheckResult.relationship === 'one-to-many' && (
                            <div className="mt-2">
                              <p className="text-[11px] text-text-tertiary mb-2">Multiple matches per user. Pick the most relevant by sorting:</p>
                              <InputField label="Sort Field" value={enrichment.sort_field || ''} onChange={(v) => setEnrichment({ ...enrichment, sort_field: v })} placeholder="e.g. createdAt" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <InputField
            label="Product Name"
            value={productName}
            onChange={setProductName}
            placeholder="e.g. SoulSync, Acme Corp"
            helper="Used in email templates and the agent's context."
          />
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
          {/* Left Column: Mappings form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-text-primary">Field Mapping</span>
                <p className="text-xs text-text-tertiary mt-0.5">Assign attributes, metrics, or custom properties to database fields.</p>
              </div>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggestionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-muted text-accent hover:bg-accent/20 transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                {suggestionLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                {suggestionLoading ? 'Analyzing...' : 'Auto-suggest'}
              </button>
            </div>

            {suggestionApplied && (
              <div className="rounded-lg border border-accent/20 bg-accent-muted/50 px-3 py-2.5 flex items-start gap-2">
                <Check size={14} className="text-accent mt-0.5 shrink-0" />
                <p className="text-xs text-accent">
                  AI suggestion applied. Review and adjust mappings below.
                </p>
              </div>
            )}

            {/* Core Mappings (Email, Name, Join Date, Last Active) */}
            <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-4">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Core Mappings</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField label="Email Field" value={fieldMapping.email} onChange={(v) => setFieldMapping({ ...fieldMapping, email: v })} options={fieldNames} placeholder="None" />
                <SelectField label="Name Field" value={fieldMapping.name} onChange={(v) => setFieldMapping({ ...fieldMapping, name: v })} options={fieldNames} placeholder="None" />
                <SelectField label="Join Date Field" value={fieldMapping.joined_date} onChange={(v) => setFieldMapping({ ...fieldMapping, joined_date: v })} options={fieldNames} placeholder="None" />
                <SelectField label="Last Active Field" value={fieldMapping.last_active} onChange={(v) => setFieldMapping({ ...fieldMapping, last_active: v })} options={fieldNames} placeholder="None" />
              </div>
            </div>

            {/* Unified Custom Fields and Metrics */}
            <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Additional Fields & Metrics
                </span>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-3 px-2 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                <div className="col-span-5">Database Field</div>
                <div className="col-span-4">Display Label</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {customFields.map((cf, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-surface border border-border rounded-xl p-2.5 transition-all hover:border-border-strong/50">
                    <div className="col-span-5">
                      <select
                        value={cf.field}
                        onChange={(e) => handleCustomFieldChange(idx, 'field', e.target.value)}
                        className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none transition-all duration-200 focus:border-border-strong focus:bg-surface-hover appearance-none cursor-pointer"
                      >
                        <option value="">None</option>
                        {fieldNames.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={cf.label}
                        onChange={(e) => handleCustomFieldChange(idx, 'label', e.target.value)}
                        placeholder="e.g. Listened Time"
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none transition-all duration-200 focus:border-border-strong"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={cf.unit}
                        onChange={(e) => handleCustomFieldChange(idx, 'unit', e.target.value)}
                        placeholder="e.g. sec"
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none transition-all duration-200 focus:border-border-strong"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeCustomField(idx)}
                        className="text-text-tertiary hover:text-error transition-colors p-1.5 cursor-pointer"
                        title="Clear or remove field"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={addCustomField}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer text-text-secondary"
                >
                  <Plus size={13} /> More Fields
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Schema Preview */}
          <div className="lg:col-span-5">
            <div className="bg-surface-raised border border-border rounded-xl p-4 sticky top-6 space-y-4">
              <div>
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">LookOut Data Schema Preview</span>
                <p className="text-[11px] text-text-tertiary mt-1">This is the structure the LookOut agent will query and view.</p>
              </div>
              <pre className="bg-[#121214] text-accent border border-border/80 rounded-lg p-3 text-xs font-mono overflow-auto max-h-[400px] leading-relaxed select-all">
                {buildSchemaPreviewJson()}
              </pre>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-4">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Sender Details</span>
            <InputField label="Sender Name" value={senderName} onChange={setSenderName} placeholder="e.g. SoulSync" />
            <InputField label="Sender Email" value={senderEmail} onChange={setSenderEmail} placeholder="e.g. hello@soulsync.com" helper="Must be verified in your Brevo account." />
          </div>

          {/* Configuration summary */}
          <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-3">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Configuration Summary</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Database</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{dbName || '—'}</p>
              </div>
              <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Collection</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{collectionName || '—'}</p>
              </div>
              {numCollections === 2 && enrichment.collection && (
                <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Enrichment</p>
                  <p className="text-sm font-medium text-text-primary mt-0.5">{enrichment.collection}</p>
                </div>
              )}
              <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Product</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{productName || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}



      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all duration-150 cursor-pointer">
            <ChevronLeft size={14} /> Back
          </button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 ? !canProceedStep0 : step === 1 ? !canProceedStep1 : !canProceedStep2}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-accent text-surface text-sm font-medium transition-all duration-150 hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-accent text-surface text-sm font-medium transition-all duration-150 hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {existingSettings?.setup_complete ? 'Save Changes' : 'Complete Setup'}
          </button>
        )}
      </div>
    </div>
  );
}
