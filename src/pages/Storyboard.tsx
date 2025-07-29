
import React, { useState } from 'react';
import { StoryboardLayout } from "@/components/StoryboardLayout";
import { StoryboardConceptSection } from "@/components/workspace/StoryboardConceptSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, ArrowRight, WandSparkles, FileText, Upload, Plus, Edit } from "lucide-react";
import { Link } from "react-router-dom";

const Storyboard = () => {
  const [activeStep, setActiveStep] = useState('concept');
  const [concept, setConcept] = useState('');
  const [projectName, setProjectName] = useState('A Night at the Bar');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoStyle, setVideoStyle] = useState('Cinematic');
  const [cinematicInspiration, setCinematicInspiration] = useState('');

  const wordCount = concept.split(' ').filter(word => word.length > 0).length;

  const videoStyles = [
    { id: 'none', name: 'None', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=120&h=80&fit=crop' },
    { id: 'cinematic', name: 'Cinematic', image: 'https://images.unsplash.com/photo-1489599162946-648229275a2c?w=120&h=80&fit=crop' },
    { id: 'vintage', name: 'Vintage', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=80&fit=crop' },
    { id: 'lowkey', name: 'Low Key', image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=120&h=80&fit=crop' }
  ];

  const handleNext = () => {
    if (activeStep === 'concept') {
      setActiveStep('storyline');
    } else if (activeStep === 'storyline') {
      setActiveStep('settings');
    } else if (activeStep === 'settings') {
      setActiveStep('breakdown');
    }
  };

  const handleBack = () => {
    if (activeStep === 'breakdown') {
      setActiveStep('settings');
    } else if (activeStep === 'settings') {
      setActiveStep('storyline');
    } else if (activeStep === 'storyline') {
      setActiveStep('concept');
    }
  };

  if (activeStep === 'concept') {
    return (
      <StoryboardLayout>
        <StoryboardConceptSection
          concept={concept}
          setConcept={setConcept}
          onNext={handleNext}
        />
      </StoryboardLayout>
    );
  }

  return (
    <StoryboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pt-4">
          <span className={activeStep === 'concept' ? 'text-primary font-medium' : 'cursor-pointer hover:text-foreground'} onClick={() => setActiveStep('concept')}>CONCEPT</span>
          <span className="text-muted-foreground/50">{'>'}</span>
          <span className={activeStep === 'storyline' ? 'text-primary font-medium' : 'cursor-pointer hover:text-foreground'} onClick={() => setActiveStep('storyline')}>STORYLINE</span>
          <span className="text-muted-foreground/50">{'>'}</span>
          <span className={activeStep === 'settings' ? 'text-primary font-medium' : 'cursor-pointer hover:text-foreground'} onClick={() => setActiveStep('settings')}>SETTINGS & CAST</span>
          <span className="text-muted-foreground/50">{'>'}</span>
          <span className={activeStep === 'breakdown' ? 'text-primary font-medium' : 'cursor-pointer hover:text-foreground'} onClick={() => setActiveStep('breakdown')}>BREAKDOWN</span>
        </div>

        {/* Storyline Step */}
        {activeStep === 'storyline' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-8">Storyline Development</h1>
            <div className="text-center py-20">
              <p className="text-muted-foreground">Storyline step content will be implemented next</p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Settings & Cast Step */}
        {activeStep === 'settings' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-8">Settings & Cast</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Settings Pane */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Settings</h3>
                
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Project Name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="border-border focus:border-primary"
                  />
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Aspect Ratio</label>
                  <ToggleGroup 
                    type="single" 
                    value={aspectRatio} 
                    onValueChange={(value) => value && setAspectRatio(value)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="16:9" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      16:9
                    </ToggleGroupItem>
                    <ToggleGroupItem value="1:1" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      1:1
                    </ToggleGroupItem>
                    <ToggleGroupItem value="9:16" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      9:16
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Video Style */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Video Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    {videoStyles.map((style) => (
                      <Card 
                        key={style.id}
                        className={`cursor-pointer transition-all ${
                          videoStyle.toLowerCase() === style.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-border/80'
                        }`}
                        onClick={() => setVideoStyle(style.name)}
                      >
                        <CardContent className="p-3">
                          <img 
                            src={style.image} 
                            alt={style.name} 
                            className="w-full h-16 object-cover rounded mb-2"
                          />
                          <p className="text-sm font-medium text-center">{style.name}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Style Reference */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Style Reference</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-border/80 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Drag & drop or click to upload</p>
                  </div>
                </div>

                {/* Cinematic Inspiration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cinematic Inspiration</label>
                  <Input
                    value={cinematicInspiration}
                    onChange={(e) => setCinematicInspiration(e.target.value)}
                    placeholder="e.g., Blade Runner, Casablanca..."
                    className="border-border focus:border-primary"
                  />
                </div>
              </div>

              {/* Cast Pane */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Cast</h3>
                
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Plus className="w-4 h-4" />
                    Add character
                  </Button>
                  
                  <Card className="border-border flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face" 
                          alt="James Carter" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">James Carter</h4>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 p-0 h-auto gap-1">
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Breakdown Step */}
        {activeStep === 'breakdown' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-8">Story Breakdown</h1>
            
            {/* Synopsis */}
            <Card className="border-border">
              <CardContent className="p-6">
                <h4 className="font-medium mb-3">Synopsis</h4>
                <p className="text-muted-foreground leading-relaxed">
                  James Carter, a weary businessman, enters a dimly lit bar after a long day. The atmosphere is heavy with jazz music and cigarette smoke. He approaches the bartender, seeking not just a drink, but a moment of respite from his troubled life. As he sits at the bar, the weight of his decisions begins to surface in this intimate setting.
                </p>
              </CardContent>
            </Card>

            {/* Scene Breakdown */}
            <Card className="border-border">
              <CardContent className="p-6">
                <h4 className="font-medium mb-4">Scene 1 - James Enters the Bar</h4>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  The heavy wooden door creaks open as James Carter steps into the smoky interior of the bar. Warm amber light spills across his tired face, revealing the stress lines that mark a man who has seen too much. The jazz trio in the corner provides a melancholic soundtrack to his entrance.
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <h5 className="text-muted-foreground font-medium mb-2 uppercase tracking-wider text-sm">Scene Description</h5>
                  <p className="text-muted-foreground">
                    <span className="text-primary">@James Carter</span> enters through the main door, his silhouette framed against the street lights behind him. Camera follows him in a slow tracking shot as he surveys the bar, taking in the atmosphere. His expression shows fatigue mixed with determination as he approaches the bar counter.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button className="px-8">
                Start Generation
              </Button>
            </div>
          </div>
        )}
      </div>
    </StoryboardLayout>
  );
};

export default Storyboard;
