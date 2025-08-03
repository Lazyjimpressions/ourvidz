import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface CompactReferenceUploadProps {
  references: Array<{
    id: string;
    label: string;
    enabled: boolean;
    url?: string;
    file?: File;
  }>;
  onReferencesChange: (references: any[]) => void;
}

export const CompactReferenceUpload = ({
  references,
  onReferencesChange
}: CompactReferenceUploadProps) => {
  const handleFileUpload = (file: File, index: number) => {
    const newReferences = [...references];
    newReferences[index] = {
      ...newReferences[index],
      file,
      url: URL.createObjectURL(file),
      enabled: true
    };
    onReferencesChange(newReferences);
  };

  const handleRemoveReference = (index: number) => {
    const newReferences = [...references];
    newReferences[index] = {
      ...newReferences[index],
      file: undefined,
      url: undefined,
      enabled: false
    };
    onReferencesChange(newReferences);
  };

  return (
    <div className="space-y-2">
      {references.map((ref, index) => (
        <div key={ref.id} className="flex items-center gap-2">
          <span className="text-sm min-w-16">{ref.label}:</span>
          
          {ref.url ? (
            <div className="flex items-center gap-2 flex-1">
              <img 
                src={ref.url} 
                alt={ref.label} 
                className="w-8 h-8 object-cover rounded"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveReference(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, index);
                }}
                className="hidden"
                id={`file-${ref.id}`}
              />
              <label htmlFor={`file-${ref.id}`}>
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </span>
                </Button>
              </label>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};