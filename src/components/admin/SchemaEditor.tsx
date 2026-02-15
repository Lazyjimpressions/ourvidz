import React, { useState, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Code, Layers, Plus, Clipboard, Trash2 } from 'lucide-react';

/* ─── Types ─── */

export interface ParamSchema {
  type: 'string' | 'integer' | 'float' | 'boolean' | 'enum' | 'object';
  default?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  label?: string;
  description?: string;
  required?: boolean;
  hidden?: boolean;
  active?: boolean;
  properties?: Record<string, ParamSchema>;
}

export type InputSchema = Record<string, ParamSchema>;

interface SchemaEditorProps {
  schema: InputSchema | null;
  inputDefaults: Record<string, any>;
  onInputDefaultsChange: (defaults: Record<string, any>) => void;
  onSchemaChange: (schema: InputSchema) => void;
}

/* ─── Main Component ─── */

export function SchemaEditor({ schema, inputDefaults, onInputDefaultsChange, onSchemaChange }: SchemaEditorProps) {
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [showAddParam, setShowAddParam] = useState(false);
  const [showPasteSchema, setShowPasteSchema] = useState(false);

  // Track which params are "active" (included in input_defaults)
  const [activeParams, setActiveParams] = useState<Record<string, boolean>>(() => {
    if (!schema) return {};
    const active: Record<string, boolean> = {};
    for (const [key, def] of Object.entries(schema)) {
      if (def.hidden) continue;
      active[key] = key in inputDefaults || def.active !== false;
    }
    return active;
  });

  const visibleParams = useMemo(() => {
    if (!schema) return [];
    return Object.entries(schema).filter(([, def]) => !def.hidden);
  }, [schema]);

  if (!schema || rawMode) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Input Defaults (JSON)</Label>
          <div className="flex gap-1">
            {schema && (
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setRawMode(false)}>
                <Layers className="h-3 w-3 mr-1" /> Schema View
              </Button>
            )}
            {!schema && (
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setShowPasteSchema(true)}>
                <Clipboard className="h-3 w-3 mr-1" /> Paste Schema
              </Button>
            )}
          </div>
        </div>
        <Textarea
          className="text-xs min-h-[50px] font-mono"
          value={JSON.stringify(inputDefaults, null, 2)}
          onChange={(e) => { try { onInputDefaultsChange(JSON.parse(e.target.value)); } catch {} }}
          placeholder='{"width": 1024}'
        />
        {showPasteSchema && (
          <PasteSchemaDialog
            onApply={(s, defaults) => {
              onSchemaChange(s);
              if (Object.keys(defaults).length > 0) {
                onInputDefaultsChange({ ...inputDefaults, ...defaults });
              }
              // Auto-activate params with defaults
              const newActive: Record<string, boolean> = {};
              for (const [key, def] of Object.entries(s)) {
                if (!def.hidden) newActive[key] = def.default !== undefined && def.default !== null;
              }
              setActiveParams(prev => ({ ...prev, ...newActive }));
              setShowPasteSchema(false);
            }}
            onCancel={() => setShowPasteSchema(false)}
          />
        )}
      </div>
    );
  }

  const toggleActive = (key: string, active: boolean) => {
    setActiveParams(prev => ({ ...prev, [key]: active }));
    if (!active) {
      const next = { ...inputDefaults };
      delete next[key];
      onInputDefaultsChange(next);
    } else {
      const def = schema[key];
      if (def.default !== undefined && def.default !== null) {
        onInputDefaultsChange({ ...inputDefaults, [key]: def.default });
      }
    }
  };

  const updateValue = (key: string, value: any) => {
    onInputDefaultsChange({ ...inputDefaults, [key]: value });
  };

  const deleteParam = (key: string) => {
    const nextSchema = { ...schema };
    delete nextSchema[key];
    onSchemaChange(nextSchema);
    const nextDefaults = { ...inputDefaults };
    delete nextDefaults[key];
    onInputDefaultsChange(nextDefaults);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[10px] text-muted-foreground">Input Parameters</Label>
          <p className="text-[9px] text-muted-foreground/60">Default values sent to the API for each generation</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setShowPasteSchema(true)}>
            <Clipboard className="h-3 w-3 mr-1" /> Paste Schema
          </Button>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setShowAddParam(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add Param
          </Button>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setRawMode(true)}>
            <Code className="h-3 w-3 mr-1" /> Raw JSON
          </Button>
        </div>
      </div>

      <div className="border rounded-md divide-y">
        {visibleParams.map(([key, def]) => (
          <ParamRow
            key={key}
            paramKey={key}
            schema={def}
            value={inputDefaults[key]}
            active={activeParams[key] ?? false}
            onToggleActive={(a) => toggleActive(key, a)}
            onValueChange={(v) => updateValue(key, v)}
            onDelete={() => deleteParam(key)}
          />
        ))}
        {visibleParams.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-3">
            No parameters defined. Add parameters or paste a schema.
          </div>
        )}
      </div>

      {showAddParam && (
        <AddParamDialog
          onAdd={(key, param) => {
            onSchemaChange({ ...schema, [key]: param });
            if (param.default !== undefined && param.default !== null) {
              onInputDefaultsChange({ ...inputDefaults, [key]: param.default });
              setActiveParams(prev => ({ ...prev, [key]: true }));
            }
            setShowAddParam(false);
          }}
          onCancel={() => setShowAddParam(false)}
        />
      )}

      {showPasteSchema && (
        <PasteSchemaDialog
          onApply={(s, defaults) => {
            onSchemaChange(s);
            if (Object.keys(defaults).length > 0) {
              onInputDefaultsChange({ ...inputDefaults, ...defaults });
            }
            const newActive: Record<string, boolean> = {};
            for (const [key, def] of Object.entries(s)) {
              if (!def.hidden) newActive[key] = def.default !== undefined && def.default !== null;
            }
            setActiveParams(prev => ({ ...prev, ...newActive }));
            setShowPasteSchema(false);
          }}
          onCancel={() => setShowPasteSchema(false)}
        />
      )}
    </div>
  );
}

/* ─── Parameter Row ─── */

function ParamRow({ paramKey, schema, value, active, onToggleActive, onValueChange, onDelete }: {
  paramKey: string;
  schema: ParamSchema;
  value: any;
  active: boolean;
  onToggleActive: (active: boolean) => void;
  onValueChange: (value: any) => void;
  onDelete: () => void;
}) {
  const label = schema.label || paramKey.replace(/_/g, ' ');

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 min-h-[28px] ${!active ? 'opacity-50' : ''}`}>
      {/* Active toggle */}
      <Switch
        checked={active}
        onCheckedChange={onToggleActive}
        className="scale-[0.6] shrink-0"
      />

      {/* Label + tooltip */}
      <div className="flex items-center gap-1 w-[120px] shrink-0">
        <span className="text-[11px] font-medium truncate capitalize">{label}</span>
        {schema.description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs max-w-[200px]">
              {schema.description}
            </TooltipContent>
          </Tooltip>
        )}
        {schema.required && (
          <Badge variant="outline" className="text-[8px] h-3 px-1">req</Badge>
        )}
      </div>

      {/* Control */}
      <div className="flex-1 min-w-0">
        <ParamControl
          schema={schema}
          value={value}
          active={active}
          onChange={onValueChange}
        />
      </div>

      {/* Range indicator */}
      {(schema.type === 'integer' || schema.type === 'float') && schema.min !== undefined && (
        <span className="text-[9px] text-muted-foreground/60 shrink-0 w-[55px] text-right">
          ({schema.min}–{schema.max})
        </span>
      )}

      {/* Delete */}
      <button onClick={onDelete} className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ─── Parameter Control ─── */

function ParamControl({ schema, value, active, onChange }: {
  schema: ParamSchema;
  value: any;
  active: boolean;
  onChange: (value: any) => void;
}) {
  if (!active) {
    return <span className="text-[10px] text-muted-foreground italic">API default</span>;
  }

  switch (schema.type) {
    case 'integer':
    case 'float': {
      const hasRange = schema.min !== undefined && schema.max !== undefined;
      const step = schema.step || (schema.type === 'float' ? 0.1 : 1);
      const current = value ?? schema.default ?? schema.min ?? 0;

      if (hasRange) {
        return (
          <div className="flex items-center gap-2">
            <Slider
              size="xs"
              min={schema.min}
              max={schema.max}
              step={step}
              value={[current]}
              onValueChange={([v]) => onChange(v)}
              className="flex-1"
            />
            <Input
              type="number"
              className="h-5 w-14 text-[10px] px-1 text-center"
              value={current}
              min={schema.min}
              max={schema.max}
              step={step}
              onChange={(e) => {
                const v = schema.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value);
                if (!isNaN(v)) onChange(v);
              }}
            />
          </div>
        );
      }

      return (
        <Input
          type="number"
          className="h-5 text-[10px] w-24"
          value={value ?? ''}
          placeholder={schema.default?.toString() || ''}
          onChange={(e) => {
            const v = schema.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value);
            if (!isNaN(v)) onChange(v);
            else if (e.target.value === '') onChange(null);
          }}
        />
      );
    }

    case 'boolean':
      return (
        <Switch
          checked={value ?? schema.default ?? false}
          onCheckedChange={onChange}
          className="scale-75"
        />
      );

    case 'enum':
      return (
        <Select value={String(value ?? schema.default ?? '')} onValueChange={onChange}>
          <SelectTrigger className="h-5 text-[10px] w-[120px]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {(schema.options || []).map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'string':
      return (
        <Input
          className="h-5 text-[10px]"
          value={value ?? ''}
          placeholder={schema.default?.toString() || 'API default'}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case 'object':
      if (schema.properties) {
        return (
          <div className="flex items-center gap-2">
            {Object.entries(schema.properties).map(([subKey, subSchema]) => (
              <div key={subKey} className="flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground">{subKey}:</span>
                <Input
                  type="number"
                  className="h-5 w-14 text-[10px] px-1"
                  value={value?.[subKey] ?? subSchema.default ?? ''}
                  min={subSchema.min}
                  max={subSchema.max}
                  step={subSchema.step || 1}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    onChange({ ...(value || {}), [subKey]: isNaN(v) ? null : v });
                  }}
                />
              </div>
            ))}
          </div>
        );
      }
      return <span className="text-[10px] text-muted-foreground">Complex object</span>;

    default:
      return (
        <Input
          className="h-5 text-[10px]"
          value={value ?? ''}
          placeholder={schema.default?.toString() || 'API default'}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }
}

/* ─── Add Parameter Dialog ─── */

function AddParamDialog({ onAdd, onCancel }: {
  onAdd: (key: string, param: ParamSchema) => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState('');
  const [type, setType] = useState<ParamSchema['type']>('string');
  const [defaultVal, setDefaultVal] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [step, setStep] = useState('');
  const [options, setOptions] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!key.trim()) return;
    const param: ParamSchema = { type };
    if (description) param.description = description;

    if (type === 'integer' || type === 'float') {
      if (min) param.min = parseFloat(min);
      if (max) param.max = parseFloat(max);
      if (step) param.step = parseFloat(step);
      if (defaultVal) param.default = type === 'float' ? parseFloat(defaultVal) : parseInt(defaultVal);
    } else if (type === 'boolean') {
      param.default = defaultVal === 'true';
    } else if (type === 'enum') {
      param.options = options.split(',').map(o => o.trim()).filter(Boolean);
      if (defaultVal) param.default = defaultVal;
    } else if (type === 'string') {
      if (defaultVal) param.default = defaultVal;
    }

    onAdd(key.trim(), param);
  };

  return (
    <div className="border rounded-md p-2 space-y-2 bg-muted/30">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase">Add Parameter</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[9px]">Key</Label>
          <Input className="h-6 text-[10px]" value={key} onChange={(e) => setKey(e.target.value)} placeholder="param_name" />
        </div>
        <div>
          <Label className="text-[9px]">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ParamSchema['type'])}>
            <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['string', 'integer', 'float', 'boolean', 'enum'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px]">Default</Label>
          <Input className="h-6 text-[10px]" value={defaultVal} onChange={(e) => setDefaultVal(e.target.value)} placeholder="value" />
        </div>
      </div>
      {(type === 'integer' || type === 'float') && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[9px]">Min</Label>
            <Input className="h-6 text-[10px]" type="number" value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div>
            <Label className="text-[9px]">Max</Label>
            <Input className="h-6 text-[10px]" type="number" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <div>
            <Label className="text-[9px]">Step</Label>
            <Input className="h-6 text-[10px]" type="number" value={step} onChange={(e) => setStep(e.target.value)} />
          </div>
        </div>
      )}
      {type === 'enum' && (
        <div>
          <Label className="text-[9px]">Options (comma-separated)</Label>
          <Input className="h-6 text-[10px]" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="opt1, opt2, opt3" />
        </div>
      )}
      <div>
        <Label className="text-[9px]">Description</Label>
        <Input className="h-6 text-[10px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional help text" />
      </div>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-6 text-[10px]" onClick={handleAdd} disabled={!key.trim()}>Add</Button>
      </div>
    </div>
  );
}

/* ─── Paste Schema Dialog ─── */

function PasteSchemaDialog({ onApply, onCancel }: {
  onApply: (schema: InputSchema, defaults: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');

  const handleApply = () => {
    try {
      const parsed = JSON.parse(text);
      const raw = parsed.input_schema || parsed;

      // Detect fal.ai / OpenAPI format: has "properties" key or nested objects with "type"
      const isFalFormat = raw.properties ||
        Object.values(raw).some((v: any) => v && typeof v === 'object' && ('type' in v || 'title' in v || 'allOf' in v || 'anyOf' in v));

      // Detect our internal format: values already have our known types
      const isInternalFormat = !raw.properties &&
        Object.values(raw).every((v: any) => v && typeof v === 'object' && 
          ['string', 'integer', 'float', 'boolean', 'enum', 'object'].includes(v.type));

      let schema: InputSchema;
      if (isInternalFormat) {
        schema = raw as InputSchema;
      } else if (isFalFormat) {
        schema = mapFalSchema(raw);
      } else {
        schema = mapFalSchema(raw); // fallback: try mapping anyway
      }

      // Extract defaults from schema and auto-activate params that have defaults
      const defaults: Record<string, any> = {};
      for (const [key, def] of Object.entries(schema)) {
        if (def.default !== undefined && def.default !== null) {
          defaults[key] = def.default;
          def.active = true;
        }
      }

      onApply(schema, defaults);
    } catch {
      // Invalid JSON
    }
  };

  return (
    <div className="border rounded-md p-2 space-y-2 bg-muted/30">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase">Paste Input Schema JSON</div>
      <Textarea
        className="text-xs min-h-[80px] font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Paste input_schema JSON or fal.ai schema...'
      />
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-6 text-[10px]" onClick={handleApply} disabled={!text.trim()}>Apply Schema</Button>
      </div>
    </div>
  );
}

/* ─── fal.ai Schema Mapper ─── */

function extractEnumFromComposite(def: any): string[] | null {
  const candidates = def.allOf || def.anyOf || def.oneOf || [];
  for (const item of candidates) {
    if (item.enum) return item.enum;
    if (item.type === 'string' && item.enum) return item.enum;
  }
  return null;
}

function resolveRef(def: any, defs: Record<string, any>): any {
  if (!def || !def.$ref) return def;
  const refKey = def.$ref.split('/').pop();
  const resolved = defs[refKey];
  if (!resolved) return def; // unresolvable, keep as-is
  // Merge: property-level fields (title, description, default) override resolved definition
  const { $ref, ...rest } = def;
  return { ...resolved, ...rest };
}

function mapFalProperty(def: any, defs: Record<string, any> = {}): ParamSchema {
  // Resolve $ref first
  def = resolveRef(def, defs);

  const param: ParamSchema = { type: 'string' };

  // Handle allOf/anyOf/oneOf with enums
  const compositeEnum = extractEnumFromComposite(def);
  if (compositeEnum) {
    param.type = 'enum';
    param.options = compositeEnum.map(String);
  } else if (def.type === 'integer') {
    param.type = 'integer';
  } else if (def.type === 'number') {
    param.type = 'float';
  } else if (def.type === 'boolean') {
    param.type = 'boolean';
  } else if (def.type === 'string' && def.enum) {
    param.type = 'enum';
    param.options = def.enum;
  } else if (def.type === 'string') {
    param.type = 'string';
  } else if (def.type === 'array') {
    param.type = 'string';
    param.description = (def.description || '') + ' (comma-separated list)';
  } else if (def.type === 'object' && def.properties) {
    param.type = 'object';
    param.properties = {};
    for (const [subKey, subDef] of Object.entries(def.properties) as [string, any][]) {
      param.properties[subKey] = mapFalProperty(subDef, defs);
    }
  } else if (def.enum) {
    param.type = 'enum';
    param.options = def.enum.map(String);
  }

  // Range constraints
  if (def.minimum !== undefined) param.min = def.minimum;
  if (def.maximum !== undefined) param.max = def.maximum;
  if (def.exclusiveMinimum !== undefined) param.min = def.exclusiveMinimum + (param.type === 'integer' ? 1 : 0.01);
  if (def.exclusiveMaximum !== undefined) param.max = def.exclusiveMaximum - (param.type === 'integer' ? 1 : 0.01);

  // Metadata
  if (def.default !== undefined) param.default = def.default;
  if (def.description) param.description = def.description.slice(0, 200);
  if (def.title) param.label = def.title;

  return param;
}

function mapFalSchema(falSchema: any): InputSchema {
  const result: InputSchema = {};
  const defs = falSchema.$defs || falSchema.definitions || {};
  const props = falSchema.properties || falSchema;

  for (const [key, rawDef] of Object.entries(props) as [string, any][]) {
    if (!rawDef || typeof rawDef !== 'object') continue;
    // Skip meta keys
    if (key === '$defs' || key === 'definitions') continue;
    result[key] = mapFalProperty(rawDef, defs);
  }

  return result;
}

/* ─── Capabilities Editor ─── */

const KNOWN_CAPABILITY_KEYS: Record<string, { type: 'boolean' | 'number' | 'string' | 'enum'; options?: string[] }> = {
  supports_i2v: { type: 'boolean' },
  supports_t2v: { type: 'boolean' },
  supports_i2i: { type: 'boolean' },
  supports_t2i: { type: 'boolean' },
  supports_start_end_frames: { type: 'boolean' },
  wan_i2v: { type: 'boolean' },
  char_limit: { type: 'number' },
  nsfw_status: { type: 'string' },
  safety_checker_param: { type: 'string' },
};

export function CapabilitiesEditor({ capabilities, onChange }: {
  capabilities: Record<string, any>;
  onChange: (caps: Record<string, any>) => void;
}) {
  const [rawMode, setRawMode] = useState(false);
  const [addKey, setAddKey] = useState('');

  // Separate input_schema from other capabilities
  const { input_schema, ...otherCaps } = capabilities || {};

  if (rawMode) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Capabilities (JSON)</Label>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setRawMode(false)}>
            <Layers className="h-3 w-3 mr-1" /> Structured
          </Button>
        </div>
        <Textarea
          className="text-xs min-h-[80px] font-mono"
          value={JSON.stringify(otherCaps, null, 2)}
          onChange={(e) => { try { onChange({ ...JSON.parse(e.target.value), ...(input_schema ? { input_schema } : {}) }); } catch {} }}
        />
      </div>
    );
  }

  const entries = Object.entries(otherCaps).filter(([k]) => k !== 'video');
  const videoEntries = otherCaps.video ? Object.entries(otherCaps.video) : [];

  const updateCap = (key: string, value: any) => {
    onChange({ ...capabilities, [key]: value });
  };

  const deleteCap = (key: string) => {
    const next = { ...capabilities };
    delete next[key];
    onChange(next);
  };

  const addCapability = () => {
    if (!addKey.trim()) return;
    onChange({ ...capabilities, [addKey.trim()]: '' });
    setAddKey('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[10px] text-muted-foreground">Capabilities</Label>
          <p className="text-[9px] text-muted-foreground/60">Feature flags and metadata (not sent to API)</p>
        </div>
        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setRawMode(true)}>
          <Code className="h-3 w-3 mr-1" /> Raw JSON
        </Button>
      </div>

      <div className="border rounded-md divide-y">
        {entries.map(([key, val]) => (
          <CapabilityRow key={key} capKey={key} value={val} onChange={(v) => updateCap(key, v)} onDelete={() => deleteCap(key)} />
        ))}
        {videoEntries.length > 0 && (
          <div className="px-2 py-1">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase">video</span>
            <div className="ml-2 divide-y">
              {videoEntries.map(([key, val]) => (
                <CapabilityRow
                  key={key}
                  capKey={key}
                  value={val}
                  onChange={(v) => onChange({ ...capabilities, video: { ...otherCaps.video, [key]: v } })}
                  onDelete={() => {
                    const nextVideo = { ...otherCaps.video };
                    delete nextVideo[key];
                    onChange({ ...capabilities, video: Object.keys(nextVideo).length ? nextVideo : undefined });
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {entries.length === 0 && videoEntries.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-3">No capabilities defined.</div>
        )}
      </div>

      {/* Add capability */}
      <div className="flex items-center gap-1">
        <Input
          className="h-5 text-[10px] flex-1"
          value={addKey}
          onChange={(e) => setAddKey(e.target.value)}
          placeholder="Add capability key..."
          onKeyDown={(e) => e.key === 'Enter' && addCapability()}
        />
        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 shrink-0" onClick={addCapability} disabled={!addKey.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function CapabilityRow({ capKey, value, onChange, onDelete }: {
  capKey: string;
  value: any;
  onChange: (value: any) => void;
  onDelete: () => void;
}) {
  const known = KNOWN_CAPABILITY_KEYS[capKey];
  const isObject = typeof value === 'object' && value !== null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 min-h-[26px]">
      <span className="text-[10px] font-medium w-[130px] shrink-0 truncate">{capKey}</span>
      <div className="flex-1 min-w-0">
        {typeof value === 'boolean' || known?.type === 'boolean' ? (
          <Switch checked={!!value} onCheckedChange={onChange} className="scale-[0.6]" />
        ) : typeof value === 'number' || known?.type === 'number' ? (
          <Input
            type="number"
            className="h-5 text-[10px] w-20"
            value={value ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          />
        ) : isObject ? (
          <Input
            className="h-5 text-[10px] font-mono"
            value={JSON.stringify(value)}
            onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch {} }}
          />
        ) : (
          <Input
            className="h-5 text-[10px]"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
      <button onClick={onDelete} className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
