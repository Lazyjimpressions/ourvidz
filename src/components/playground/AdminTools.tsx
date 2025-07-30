import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings, TestTube, Monitor, Wrench } from 'lucide-react';

interface AdminTool {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  systemPrompt: string;
}

const adminTools: AdminTool[] = [
  {
    id: 'prompt-builder',
    name: 'Prompt Builder',
    icon: Wrench,
    description: 'AI assistant for creating optimized prompts',
    systemPrompt: 'You are an expert AI prompt engineer. Help create and optimize prompts for various AI models. Provide specific, actionable improvements and explain prompt engineering principles.',
  },
  {
    id: 'prompt-tester',
    name: 'Prompt Tester',
    icon: TestTube,
    description: 'Test and analyze prompt effectiveness',
    systemPrompt: 'You are a prompt testing specialist. Analyze prompts for effectiveness, suggest improvements, and simulate potential results. Provide detailed feedback on structure and optimization.',
  },
  {
    id: 'system-monitor',
    name: 'System Monitor',
    icon: Monitor,
    description: 'Monitor system performance and health',
    systemPrompt: 'You are a system administrator AI. Help monitor system status, diagnose issues, and provide technical insights. Focus on performance optimization and troubleshooting.',
  },
  {
    id: 'model-config',
    name: 'Model Config',
    icon: Settings,
    description: 'Configure AI model parameters',
    systemPrompt: 'You are an AI model configuration expert. Help optimize model parameters, explain settings, and suggest configurations for different use cases.',
  },
];

interface AdminToolsProps {
  onStartTool: (tool: AdminTool, context?: any) => void;
}

export const AdminTools: React.FC<AdminToolsProps> = ({ onStartTool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [targetModel, setTargetModel] = useState('');
  const [purpose, setPurpose] = useState('');

  const handleToolStart = () => {
    const tool = adminTools.find(t => t.id === selectedTool);
    if (tool) {
      const context = {
        targetModel,
        purpose,
      };
      onStartTool(tool, context);
      setIsOpen(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between h-8">
          Admin Tools
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-gray-800 bg-gray-900/50">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Admin Tools</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {adminTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Button
                    key={tool.id}
                    variant={selectedTool === tool.id ? 'default' : 'outline'}
                    onClick={() => setSelectedTool(tool.id)}
                    className="h-16 p-2 flex flex-col items-center justify-center text-xs"
                  >
                    <IconComponent className="h-4 w-4 mb-1" />
                    <span className="text-center leading-tight">{tool.name}</span>
                  </Button>
                );
              })}
            </div>

            {selectedTool && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Model</label>
                  <Select value={targetModel} onValueChange={setTargetModel}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sdxl" className="text-xs">SDXL Image Generation</SelectItem>
                      <SelectItem value="wan_video" className="text-xs">WAN Video Generation</SelectItem>
                      <SelectItem value="wan_image" className="text-xs">WAN Image Generation</SelectItem>
                      <SelectItem value="gpt" className="text-xs">Chat Model</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Purpose/Goal</label>
                  <Textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Describe what you want to achieve..."
                    className="min-h-[60px] text-xs resize-none"
                  />
                </div>

                <Button 
                  onClick={handleToolStart}
                  disabled={!selectedTool}
                  size="sm"
                  className="w-full h-8 text-xs"
                >
                  Start Tool
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};