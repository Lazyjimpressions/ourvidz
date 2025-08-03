import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableCell } from './EditableCell';
import { useToast } from '@/hooks/use-toast';

interface PromptTemplate {
  id: string;
  template_name: string;
  enhancer_model: string;
  use_case: string;
  content_mode: string;
  system_prompt: string;
  token_limit: number;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata?: any;
  job_type?: string;
  target_model?: string;
  description?: string;
  comment?: string;
}

interface PromptTemplatesTableProps {
  templates: PromptTemplate[];
  onUpdate: (id: string, updates: Partial<PromptTemplate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (template: PromptTemplate) => Promise<void>;
  estimateTokens: (text: string) => number;
}

export function PromptTemplatesTable({
  templates,
  onUpdate,
  onDelete,
  onTest,
  estimateTokens
}: PromptTemplatesTableProps) {
  const [editingCells, setEditingCells] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleCellEdit = (templateId: string, field: string, editing: boolean) => {
    const key = `${templateId}-${field}`;
    setEditingCells(prev => ({ ...prev, [key]: editing }));
  };

  const handleUpdate = async (templateId: string, field: string, value: any) => {
    try {
      await onUpdate(templateId, { [field]: value });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive'
      });
    }
  };

  const modelOptions = [
    { value: 'sdxl', label: 'SDXL' },
    { value: 'wan', label: 'WAN' },
    { value: 'qwen_base', label: 'Qwen Base' },
    { value: 'qwen_instruct', label: 'Qwen Instruct' }
  ];

  const useCaseOptions = [
    { value: 'enhancement', label: 'Enhancement' },
    { value: 'chat', label: 'Chat' },
    { value: 'conversion', label: 'Conversion' },
    { value: 'optimization', label: 'Optimization' }
  ];

  const contentModeOptions = [
    { value: 'sfw', label: 'SFW' },
    { value: 'nsfw', label: 'NSFW' }
  ];

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[180px] text-xs">Name</TableHead>
            <TableHead className="w-[100px] text-xs">Model</TableHead>
            <TableHead className="w-[120px] text-xs">Use Case</TableHead>
            <TableHead className="w-[80px] text-xs">Content</TableHead>
            <TableHead className="w-[300px] text-xs">System Prompt</TableHead>
            <TableHead className="w-[80px] text-xs">Tokens</TableHead>
            <TableHead className="w-[60px] text-xs">Active</TableHead>
            <TableHead className="w-[120px] text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => {
            const tokenCount = estimateTokens(template.system_prompt);
            const isOverLimit = tokenCount > template.token_limit;
            
            return (
              <TableRow key={template.id} className="text-xs">
                <TableCell className="p-1">
                  <EditableCell
                    value={template.template_name}
                    type="text"
                    onSave={(value) => handleUpdate(template.id, 'template_name', value)}
                    isEditing={editingCells[`${template.id}-template_name`] || false}
                    onEditingChange={(editing) => handleCellEdit(template.id, 'template_name', editing)}
                    truncateAt={25}
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <EditableCell
                    value={template.enhancer_model}
                    type="select"
                    options={modelOptions}
                    onSave={(value) => handleUpdate(template.id, 'enhancer_model', value)}
                    isEditing={editingCells[`${template.id}-enhancer_model`] || false}
                    onEditingChange={(editing) => handleCellEdit(template.id, 'enhancer_model', editing)}
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <EditableCell
                    value={template.use_case}
                    type="select"
                    options={useCaseOptions}
                    onSave={(value) => handleUpdate(template.id, 'use_case', value)}
                    isEditing={editingCells[`${template.id}-use_case`] || false}
                    onEditingChange={(editing) => handleCellEdit(template.id, 'use_case', editing)}
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <span className="text-xs">{template.content_mode.toUpperCase()}</span>
                </TableCell>
                
                <TableCell className="p-1">
                  <EditableCell
                    value={template.system_prompt}
                    type="textarea"
                    onSave={(value) => handleUpdate(template.id, 'system_prompt', value)}
                    isEditing={editingCells[`${template.id}-system_prompt`] || false}
                    onEditingChange={(editing) => handleCellEdit(template.id, 'system_prompt', editing)}
                    truncateAt={60}
                    maxLength={4000}
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <span className={`text-xs ${isOverLimit ? 'text-destructive' : ''}`}>
                    {tokenCount}/{template.token_limit}
                  </span>
                </TableCell>
                
                <TableCell className="p-1">
                  <Checkbox
                    checked={template.is_active}
                    onCheckedChange={(checked) => handleUpdate(template.id, 'is_active', checked)}
                    className="h-4 w-4"
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => onTest(template)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      test
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={() => onDelete(template.id)}
                      className="text-red-600 hover:text-red-800 underline"
                    >
                      delete
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}