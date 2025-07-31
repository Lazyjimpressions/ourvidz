import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, BookOpen, Users, Map, Lightbulb } from 'lucide-react';

interface CreativeTool {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

const creativeTools: CreativeTool[] = [
  {
    id: 'story-development',
    name: 'Story Dev',
    icon: BookOpen,
    description: 'Develop stories, plots, and narratives',
  },
  {
    id: 'character-creation',
    name: 'Characters',
    icon: Users,
    description: 'Create and develop characters',
  },
  {
    id: 'world-building',
    name: 'World Build',
    icon: Map,
    description: 'Build fictional worlds and settings',
  },
  {
    id: 'idea-generator',
    name: 'Ideas',
    icon: Lightbulb,
    description: 'Generate creative ideas and concepts',
  },
];

interface CreativeToolsProps {
  onStartTool: (tool: CreativeTool, context?: any) => void;
}

export const CreativeTools: React.FC<CreativeToolsProps> = ({ onStartTool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [projectType, setProjectType] = useState('');
  const [goal, setGoal] = useState('');

  const handleToolStart = () => {
    const tool = creativeTools.find(t => t.id === selectedTool);
    if (tool) {
      const context = {
        projectType,
        goal,
      };
      onStartTool(tool, context);
      setIsOpen(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between h-8">
          Creative Tools
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-gray-800 bg-gray-900/50">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Creative Tools</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {creativeTools.map((tool) => {
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
                  <label className="text-xs text-gray-400 block mb-1">Project Type</label>
                  <Input
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    placeholder="e.g., Novel, Short story, Game..."
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Goal</label>
                  <Textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="What do you want to work on or achieve?"
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