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
    <div className="max-w-7xl mx-auto px-6 py-4">
      {/* Progress Steps */}
      <div className="flex items-center gap-3 text-xs font-medium mb-6 pb-4 border-b border-border">
        <span className="text-primary bg-primary/10 px-3 py-1.5 rounded-md">CONCEPT</span>
        <span className="text-muted-foreground/30">→</span>
        <span className="text-muted-foreground">STORYLINE</span>
        <span className="text-muted-foreground/30">→</span>
        <span className="text-muted-foreground">SETTINGS & CAST</span>
        <span className="text-muted-foreground/30">→</span>
        <span className="text-muted-foreground">BREAKDOWN</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <h1 className="text-xl font-semibold text-foreground mb-6">Input your concept</h1>

          {/* Method Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <Card 
              className={`cursor-pointer transition-all border ${
                selectedMethod === 'ai' 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-border/50 hover:border-border'
              }`}
              onClick={() => setSelectedMethod('ai')}
            >
              <CardContent className="p-4 text-center">
                <WandSparkles className={`w-6 h-6 mx-auto mb-2 ${
                  selectedMethod === 'ai' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <h3 className="text-sm font-medium mb-1">Develop concept with AI</h3>
                <p className="text-xs text-muted-foreground">Let AI help you develop your story</p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all border ${
                selectedMethod === 'script' 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-border/50 hover:border-border'
              }`}
              onClick={() => setSelectedMethod('script')}
            >
              <CardContent className="p-4 text-center">
                <FileText className={`w-6 h-6 mx-auto mb-2 ${
                  selectedMethod === 'script' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <h3 className="text-sm font-medium mb-1">Stick to the script</h3>
                <p className="text-xs text-muted-foreground">Use your own script or story</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Input Area */}
          <div className="space-y-3">
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Describe your story concept in detail. Include the main characters, setting, and key plot points..."
              className="min-h-[280px] text-sm resize-none border-border/50 bg-card/50 focus:border-primary/50 focus:bg-card"
            />
            
            {/* Bottom Controls */}
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                <Upload className="w-3 h-3" />
                Upload Text
              </Button>
              
              <div className="text-xs text-muted-foreground">
                {concept.length} / 12000
              </div>
            </div>
          </div>

          {/* Optional Settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground">Optional settings</h3>
            
            {/* Special Requests */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                SPECIAL REQUESTS
              </label>
              <Input
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any specific requirements or preferences..."
                className="text-sm border-border/50 bg-card/50 focus:border-primary/50 focus:bg-card h-8"
              />
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                FORMAT
              </label>
              <div className="flex gap-2">
                {formatOptions.map((option) => (
                  <Button
                    key={option}
                    variant={format === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormat(option)}
                    className="text-xs h-7 px-3"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {/* Genre and Tone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  GENRE
                </label>
                <Input
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g., Drama, Thriller, Comedy..."
                  className="text-sm border-border/50 bg-card/50 focus:border-primary/50 focus:bg-card h-8"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  TONE
                </label>
                <Input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g., Dark, Uplifting, Mysterious..."
                  className="text-sm border-border/50 bg-card/50 focus:border-primary/50 focus:bg-card h-8"
                />
              </div>
            </div>

            {/* Speech Section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                SPEECH
              </label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={voiceoverEnabled}
                  onCheckedChange={setVoiceoverEnabled}
                />
                <span className="text-xs font-medium">ADD VOICEOVER</span>
              </div>
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={onNext}
              disabled={!concept.trim()}
              size="sm"
              className="px-6 gap-2 text-xs"
            >
              Next
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Examples Sidebar */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">Examples</h3>
            <div className="space-y-3">
              {examples.map((example, index) => (
                <Card key={index} className="border-border/50 hover:border-border cursor-pointer transition-colors bg-card/30">
                  <CardContent className="p-3">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {index === 0 ? 'LOGLINE' : index === 1 ? 'STORYLINE' : 'CONCEPT'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {example}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground bg-card/30 p-3 rounded-lg border border-border/50">
            <p className="mb-2 font-medium">Tips for writing concepts:</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
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