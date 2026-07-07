import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, Loader2, Database, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  getDatabases,
  getCollections,
  getSample,
  suggestMapping,
  checkJoin,
  saveSettings,
} from '../api';

const STEPS = ['Database', 'Fields', 'Sender', 'Enrichment'];

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium transition-all duration-200 ${
            i < current
              ? 'bg-accent text-surface'
              : i === current
                ? 'bg-accent-muted text-accent border border-accent/30'
                : 'bg-surface-raised text-text-tertiary border border-border'
          }`}>
            {i < current ? <Check size={12} /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${
            i <= current ? 'text-text-secondary' : 'text-text-tertiary'
          }`}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight size={12} className="text-text-tertiary mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</label>
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

  const [dbName, setDbName] = useState(existingSettings?.db_name || '');
  const [collectionName, setCollectionName] = useState(existingSettings?.collection_name || '');
  const [productName, setProductName] = useState(existingSettings?.product_name || '');

  const [fieldMapping, setFieldMapping] = useState(existingSettings?.field_mapping || {
    email: '', name: '', joined_date: '', last_active: '',
  });
  const [metrics, setMetrics] = useState(existingSettings?.metrics || []);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  const [senderName, setSenderName] = useState(existingSettings?.sender_name || '');
  const [senderEmail, setSenderEmail] = useState(existingSettings?.sender_email || '');

  const [useEnrichment, setUseEnrichment] = useState(!!existingSettings?.enrichment);
  const [enrichmentCollections, setEnrichmentCollections] = useState([]);
  const [enrichment, setEnrichment] = useState(existingSettings?.enrichment || {
    collection: '', local_key: '', foreign_key: '', relationship: 'one-to-one',
    sort_field: null, sort_ascending: false, reason: '',
  });
  const [joinCheckResult, setJoinCheckResult] = useState(null);

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
        useEnrichment && enrichment.collection ? enrichment.collection : null,
      );
      setFieldMapping({
        email: result.fields.email_field || '',
        name: result.fields.name_field || '',
        joined_date: result.fields.joined_date_field || '',
        last_active: result.fields.last_active_field || '',
      });
      setMetrics(result.metrics || []);
      if (result.join && useEnrichment) {
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
      await saveSettings({
        db_name: dbName,
        collection_name: collectionName,
        field_mapping: fieldMapping,
        metrics,
        sender_name: senderName,
        sender_email: senderEmail,
        product_name: productName,
        enrichment: useEnrichment ? enrichment : null,
      });
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep0 = dbName && collectionName;
  const canProceedStep1 = fieldMapping.email && fieldMapping.name;
  const canProceedStep2 = senderName && senderEmail;

  const addMetric = () => {
    setMetrics([...metrics, { field: '', label: '', unit: '' }]);
  };

  const removeMetric = (index) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index, key, value) => {
    setMetrics(metrics.map((m, i) => i === index ? { ...m, [key]: value } : m));
  };

  return (
    <div className="max-w-xl mx-auto pt-8 pb-16 px-6 animate-slide-up">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">
          {existingSettings?.setup_complete ? 'Settings' : 'Setup'}
        </h1>
        <p className="text-sm text-text-tertiary mt-1">
          {existingSettings?.setup_complete
            ? 'Update your database connection, field mappings, and sender details.'
            : 'Connect your database and configure Lookout for your product.'}
        </p>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      {error && (
        <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 mb-6">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Database size={16} className="text-accent" />
            <span className="text-sm font-medium text-text-primary">Database Connection</span>
          </div>
          <p className="text-xs text-text-tertiary">
            Your MongoDB URI is read from .env — to change it, update the MONGODB_URI variable and restart.
          </p>
          <SelectField
            label="Database"
            value={dbName}
            onChange={(v) => { setDbName(v); setCollectionName(''); setSampleFields([]); }}
            options={databases}
            placeholder="Select a database"
          />
          {dbName && (
            <SelectField
              label="Primary Collection"
              value={collectionName}
              onChange={setCollectionName}
              options={collections}
              placeholder="Select a collection"
            />
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
        <div className="space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">Field Mapping</span>
            <button
              onClick={handleSuggest}
              disabled={suggestionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-muted text-accent hover:bg-accent/20 transition-all duration-150 disabled:opacity-50 cursor-pointer"
            >
              {suggestionLoading ? <Loader2 size={12} className="animate-spin" /> : null}
              {suggestionLoading ? 'Analyzing...' : 'Auto-suggest'}
            </button>
          </div>
          {suggestionApplied && (
            <div className="rounded-lg border border-accent/20 bg-accent-muted/50 px-3 py-2">
              <p className="text-xs text-accent">
                AI suggestion applied. Review and adjust the mappings below before continuing.
              </p>
            </div>
          )}
          <SelectField label="Email Field" value={fieldMapping.email} onChange={(v) => setFieldMapping({ ...fieldMapping, email: v })} options={fieldNames} placeholder="Select field" />
          <SelectField label="Name Field" value={fieldMapping.name} onChange={(v) => setFieldMapping({ ...fieldMapping, name: v })} options={fieldNames} placeholder="Select field" />
          <SelectField label="Join Date Field" value={fieldMapping.joined_date} onChange={(v) => setFieldMapping({ ...fieldMapping, joined_date: v })} options={['', ...fieldNames]} placeholder="None" />
          <SelectField label="Last Active Field" value={fieldMapping.last_active} onChange={(v) => setFieldMapping({ ...fieldMapping, last_active: v })} options={['', ...fieldNames]} placeholder="None" />

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Metrics</span>
              <button onClick={addMetric} className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer">
                + Add metric
              </button>
            </div>
            {metrics.map((m, i) => (
              <div key={i} className="flex items-end gap-2 mb-3">
                <div className="flex-1">
                  <SelectField label={i === 0 ? "Field" : ""} value={m.field} onChange={(v) => updateMetric(i, 'field', v)} options={fieldNames} placeholder="Field" />
                </div>
                <div className="flex-1">
                  <InputField label={i === 0 ? "Label" : ""} value={m.label} onChange={(v) => updateMetric(i, 'label', v)} placeholder="Label" />
                </div>
                <div className="w-24">
                  <InputField label={i === 0 ? "Unit" : ""} value={m.unit} onChange={(v) => updateMetric(i, 'unit', v)} placeholder="Unit" />
                </div>
                <button onClick={() => removeMetric(i)} className="pb-2.5 text-text-tertiary hover:text-error transition-colors cursor-pointer text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 animate-slide-up">
          <span className="text-sm font-medium text-text-primary">Sender Details</span>
          <InputField label="Sender Name" value={senderName} onChange={setSenderName} placeholder="e.g. SoulSync" />
          <InputField label="Sender Email" value={senderEmail} onChange={setSenderEmail} placeholder="e.g. hello@soulsync.com" helper="Must be verified in your Brevo account." />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 animate-slide-up">
          <span className="text-sm font-medium text-text-primary">Enrichment (Optional)</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useEnrichment}
              onChange={(e) => setUseEnrichment(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-sm text-text-secondary">Join data from a second collection</span>
          </label>

          {useEnrichment && (
            <>
              <SelectField
                label="Secondary Collection"
                value={enrichment.collection}
                onChange={(v) => {
                  setEnrichment({ ...enrichment, collection: v });
                  setJoinCheckResult(null);
                }}
                options={collections.filter((c) => c !== collectionName)}
                placeholder="Select collection"
              />
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
            </>
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
