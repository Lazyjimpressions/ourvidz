import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { WandSparkles, FileText, Upload, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface StoryboardConceptSectionProps {
  concept: string;
  setConcept: (concept: string) => void;
  onNext: () => void;
}

export const StoryboardConceptSection = ({ 
  concept, 
  setConcept, 
  onNext 
}: StoryboardConceptSectionProps) => {
  const [selectedMethod, setSelectedMethod] = useState('ai');
  const [specialRequests, setSpecialRequests] = useState('');
  const [format, setFormat] = useState('Custom');
  const [genre, setGenre] = useState('');
  const [tone, setTone] = useState('');
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);

  const wordCount = concept.split(' ').filter(word => word.length > 0).length;

  const formatOptions = ['Custom', 'Short Film', 'Commercial'];

  const examples = [
    "A weary businessman enters a dimly lit bar after a long day. The atmosphere is heavy with jazz music and cigarette smoke.",
    "A young artist discovers a mysterious painting in her grandmother's attic that seems to change when she's not looking.",
    "Two strangers meet on a train platform during a thunderstorm, each carrying secrets that will change their lives forever."
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
        <span className="text-primary font-medium">CONCEPT</span>
        <span className="text-muted-foreground/50">{'>'}</span>
        <span>STORYLINE</span>
        <span className="text-muted-foreground/50">{'>'}</span>
        <span>SETTINGS & CAST</span>
        <span className="text-muted-foreground/50">{'>'}</span>
        <span>BREAKDOWN</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-8">Input your concept</h1>

          {/* Method Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card 
              className={`cursor-pointer transition-all ${
                selectedMethod === 'ai' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-border/80'
              }`}
              onClick={() => setSelectedMethod('ai')}
            >
              <CardContent className="p-6 text-center">
                <WandSparkles className={`w-8 h-8 mx-auto mb-3 ${
                  selectedMethod === 'ai' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <h3 className="font-medium mb-2">Develop concept with AI</h3>
                <p className="text-sm text-muted-foreground">Let AI help you develop your story</p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all ${
                selectedMethod === 'script' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-border/80'
              }`}
              onClick={() => setSelectedMethod('script')}
            >
              <CardContent className="p-6 text-center">
                <FileText className={`w-8 h-8 mx-auto mb-3 ${
                  selectedMethod === 'script' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <h3 className="font-medium mb-2">Stick to the script</h3>
                <p className="text-sm text-muted-foreground">Use your own script or story</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Input Area */}
          <div className="space-y-4">
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Describe your story concept in detail. Include the main characters, setting, and key plot points..."
              className="min-h-[300px] text-base resize-none border-border focus:border-primary"
            />
            
            {/* Bottom Controls */}
            <div className="flex justify-between items-center">
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Text
              </Button>
              
              <div className="text-sm text-muted-foreground">
                {wordCount} characters
              </div>
            </div>
          </div>

          {/* Optional Settings */}
          <div className="space-y-6 pt-6 border-t border-border">
            <h3 className="text-lg font-medium">Optional settings</h3>
            
            {/* Special Requests */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                SPECIAL REQUESTS
              </label>
              <Input
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any specific requirements or preferences..."
                className="border-border focus:border-primary"
              />
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                FORMAT
              </label>
              <div className="flex gap-2">
                {formatOptions.map((option) => (
                  <Button
                    key={option}
                    variant={format === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormat(option)}
                    className="text-sm"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {/* Genre and Tone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  GENRE
                </label>
                <Input
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g., Drama, Thriller, Comedy..."
                  className="border-border focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  TONE
                </label>
                <Input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g., Dark, Uplifting, Mysterious..."
                  className="border-border focus:border-primary"
                />
              </div>
            </div>

            {/* Speech Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                SPEECH
              </label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={voiceoverEnabled}
                  onCheckedChange={setVoiceoverEnabled}
                />
                <span className="text-sm">ADD VOICEOVER</span>
              </div>
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-6">
            <Button 
              onClick={onNext}
              disabled={!concept.trim()}
              className={`px-8 py-2 gap-2 ${
                concept.trim() 
                  ? 'bg-primary hover:bg-primary/90' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Examples Sidebar */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Examples</h3>
            <div className="space-y-4">
              {examples.map((example, index) => (
                <Card key={index} className="border-border hover:border-border/80 cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {example}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p className="mb-2">Tips for writing concepts:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Include main characters and their motivations</li>
              <li>Describe the setting and atmosphere</li>
              <li>Outline the central conflict or tension</li>
              <li>Keep it concise but detailed enough to visualize</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};