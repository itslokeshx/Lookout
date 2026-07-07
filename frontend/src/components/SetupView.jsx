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
  const [sampleFields, setSampleFields] = useState([]);

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
  const STEPS = numCollections === 2 
    ? ['Database', 'Fields', 'Sender', 'Enrichment']
    : ['Database', 'Fields', 'Sender'];

  useEffect(() => {
    getDatabases().then((d) => setDatabases(d.databases)).catch(() => {});
  }, []);

  useEffect(() => {
    if (dbName) {
      getCollections(dbName).then((d) => setCollections(d.collections)).catch(() => {});
    }
  }, [dbName]);

  useEffect(() => {
    if (dbName && collectionName) {
      getSample(dbName, collectionName).then((d) => {
        setSampleFields(d.fields || []);
      }).catch(() => {});
    }
  }, [dbName, collectionName]);

  const fieldNames = sampleFields.map((f) => f.name);

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

  const canProceedStep0 = dbName && collectionName && (numCollections === 1 || enrichment.collection);
  const canProceedStep1 = fieldMapping.name || fieldMapping.email;
  const canProceedStep2 = senderName && senderEmail;

  return (
    <div className="max-w-xl mx-auto pt-8 pb-16 px-6 animate-slide-up">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            {existingSettings?.setup_complete ? 'Settings' : 'Setup'}
          </h1>
          <p className="text-sm text-text-tertiary mt-1">
            {existingSettings?.setup_complete
              ? 'Update your database connection, field mappings, and sender details.'
              : 'Connect your database and configure Lookout for your product.'}
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
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Number of collections</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNumCollections(1)}
                className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                  numCollections === 1
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border bg-surface-raised text-text-secondary hover:bg-surface-hover'
                }`}
              >
                1 Collection
              </button>
              <button
                type="button"
                onClick={() => setNumCollections(2)}
                className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                  numCollections === 2
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border bg-surface-raised text-text-secondary hover:bg-surface-hover'
                }`}
              >
                2 Collections (Join / Enrichment)
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
        <div className="space-y-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-text-primary">Field Mapping</span>
              <p className="text-xs text-text-tertiary mt-0.5">Assign attributes, metrics, or custom properties to database fields.</p>
            </div>
            <button
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
      )}

      {step === 2 && (
        <div className="space-y-5 animate-slide-up">
          <span className="text-sm font-medium text-text-primary block mb-2">Sender Details</span>
          <InputField label="Sender Name" value={senderName} onChange={setSenderName} placeholder="e.g. SoulSync" />
          <InputField label="Sender Email" value={senderEmail} onChange={setSenderEmail} placeholder="e.g. hello@soulsync.com" helper="Must be verified in your Brevo account." />
        </div>
      )}

      {step === 3 && numCollections === 2 && (
        <div className="space-y-5 animate-slide-up">
          <span className="text-sm font-medium text-text-primary block mb-2">Enrichment / Relationship Config</span>
          <SelectField label="Local Key (primary)" value={enrichment.local_key} onChange={(v) => setEnrichment({ ...enrichment, local_key: v })} options={fieldNames} placeholder="Select key" />
          {enrichment.collection && (
            <InputField label="Foreign Key (secondary)" value={enrichment.foreign_key} onChange={(v) => setEnrichment({ ...enrichment, foreign_key: v })} placeholder="e.g. userId" />
          )}
          {enrichment.reason && (
            <div className="rounded-lg border border-accent/20 bg-accent-muted/50 px-3 py-2">
              <p className="text-xs text-accent">AI suggestion: {enrichment.reason}</p>
            </div>
          )}
          {enrichment.local_key && enrichment.foreign_key && (
            <button onClick={handleCheckJoin} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-raised border border-border text-text-secondary hover:bg-surface-hover transition-all duration-150 cursor-pointer">
              {loading ? <Loader2 size={12} className="animate-spin" /> : null}
              Check relationship
            </button>
          )}
          {joinCheckResult && (
            <div className={`rounded-lg border px-3 py-2 ${
              joinCheckResult.relationship === 'one-to-many'
                ? 'border-warning/30 bg-warning/5'
                : 'border-success/30 bg-success/5'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {joinCheckResult.relationship === 'one-to-many' && <AlertTriangle size={12} className="text-warning" />}
                <span className={`text-xs font-medium ${joinCheckResult.relationship === 'one-to-many' ? 'text-warning' : 'text-success'}`}>
                  {joinCheckResult.relationship} ({joinCheckResult.match_count} matches for sample value)
                </span>
              </div>
              {joinCheckResult.relationship === 'one-to-many' && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-text-tertiary">Multiple matches found. Choose a resolution strategy:</p>
                  <InputField label="Sort Field" value={enrichment.sort_field || ''} onChange={(v) => setEnrichment({ ...enrichment, sort_field: v })} placeholder="e.g. createdAt" helper="Use the most recent record by this field." />
                </div>
              )}
            </div>
          )}
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
