import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableCell } from './EditableCell';
import { useToast } from '@/hooks/use-toast';

interface NegativePrompt {
  id: string;
  model_type: string;
  content_mode: string;
  negative_prompt: string;
  description?: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface NegativePromptsTableProps {
  negatives: NegativePrompt[];
  onUpdate: (id: string, updates: Partial<NegativePrompt>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  estimateTokens: (text: string) => number;
}

export function NegativePromptsTable({
  negatives,
  onUpdate,
  onDelete,
  estimateTokens
}: NegativePromptsTableProps) {
  const [editingCells, setEditingCells] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleCellEdit = (negativeId: string, field: string, editing: boolean) => {
    const key = `${negativeId}-${field}`;
    setEditingCells(prev => ({ ...prev, [key]: editing }));
  };

  const handleUpdate = async (negativeId: string, field: string, value: any) => {
    try {
      await onUpdate(negativeId, { [field]: value });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update negative prompt',
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

  const contentModeOptions = [
    { value: 'sfw', label: 'SFW' },
    { value: 'nsfw', label: 'NSFW' }
  ];

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[100px] text-xs">Model</TableHead>
            <TableHead className="w-[80px] text-xs">Content</TableHead>
            <TableHead className="w-[300px] text-xs">Negative Prompt</TableHead>
            <TableHead className="w-[200px] text-xs">Description</TableHead>
            <TableHead className="w-[80px] text-xs">Priority</TableHead>
            <TableHead className="w-[60px] text-xs">Active</TableHead>
            <TableHead className="w-[80px] text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {negatives.map((negative) => {
            const tokenCount = estimateTokens(negative.negative_prompt);
            
            return (
              <TableRow key={negative.id} className="text-xs">
                <TableCell className="p-1">
                  <EditableCell
                    value={negative.model_type}
                    type="select"
                    options={modelOptions}
                    onSave={(value) => handleUpdate(negative.id, 'model_type', value)}
                    isEditing={editingCells[`${negative.id}-model_type`] || false}
                    onEditingChange={(editing) => handleCellEdit(negative.id, 'model_type', editing)}
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <EditableCell
                    value={negative.content_mode}
                    type="select"
                    options={contentModeOptions}
                    onSave={(value) => handleUpdate(negative.id, 'content_mode', value)}
                    isEditing={editingCells[`${negative.id}-content_mode`] || false}
                    onEditingChange={(editing) => handleCellEdit(negative.id, 'content_mode', editing)}
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <EditableCell
                    value={negative.negative_prompt}
                    type="textarea"
                    onSave={(value) => handleUpdate(negative.id, 'negative_prompt', value)}
                    isEditing={editingCells[`${negative.id}-negative_prompt`] || false}
                    onEditingChange={(editing) => handleCellEdit(negative.id, 'negative_prompt', editing)}
                    truncateAt={60}
                    maxLength={2000}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {tokenCount} tokens
                  </div>
                </TableCell>
                
                <TableCell className="p-1">
                  <EditableCell
                    value={negative.description || ''}
                    type="text"
                    onSave={(value) => handleUpdate(negative.id, 'description', value)}
                    isEditing={editingCells[`${negative.id}-description`] || false}
                    onEditingChange={(editing) => handleCellEdit(negative.id, 'description', editing)}
                    truncateAt={30}
                    placeholder="Add description..."
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <EditableCell
                    value={negative.priority}
                    type="number"
                    onSave={(value) => handleUpdate(negative.id, 'priority', value)}
                    isEditing={editingCells[`${negative.id}-priority`] || false}
                    onEditingChange={(editing) => handleCellEdit(negative.id, 'priority', editing)}
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <Checkbox
                    checked={negative.is_active}
                    onCheckedChange={(checked) => handleUpdate(negative.id, 'is_active', checked)}
                    className="h-4 w-4"
                  />
                </TableCell>
                
                <TableCell className="p-1">
                  <button
                    onClick={() => onDelete(negative.id)}
                    className="text-red-600 hover:text-red-800 underline text-xs"
                  >
                    delete
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}