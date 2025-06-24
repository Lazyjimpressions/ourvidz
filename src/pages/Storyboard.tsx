
import React, { useState } from 'react';
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, ArrowRight, WandSparkles, FileText, Upload, Plus, Edit } from "lucide-react";
import { Link } from "react-router-dom";

const Storyboard = () => {
  const [activeTab, setActiveTab] = useState('concept');
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

  return (
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Storyboard</h1>
          
          {/* Workflow Progress */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
            <span className={activeTab === 'concept' ? 'text-blue-400 font-medium' : ''}>CONCEPT</span>
            <span className="text-gray-600">></span>
            <span className={activeTab === 'settings' ? 'text-blue-400 font-medium' : ''}>SETTINGS & CAST</span>
            <span className="text-gray-600">></span>
            <span className={activeTab === 'breakdown' ? 'text-blue-400 font-medium' : ''}>BREAKDOWN</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden">
            <TabsTrigger value="concept">Concept</TabsTrigger>
            <TabsTrigger value="settings">Settings & Cast</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          </TabsList>

          {/* Concept Tab */}
          <TabsContent value="concept" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-white mb-8">Input your concept</h2>
              
              {/* Workflow Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                <Card className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors">
                  <CardContent className="p-6 text-center">
                    <WandSparkles className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">Develop concept with AI</h3>
                    <p className="text-gray-400 text-sm">Let AI help you develop your story</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-blue-900/30 border-blue-500 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <FileText className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">Stick to the script</h3>
                    <p className="text-gray-400 text-sm">Use your own script or story</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Large Prompt Box */}
            <div className="space-y-4">
              <Textarea
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Enter your story concept here..."
                className="min-h-[300px] bg-gray-900 border-blue-500 text-white placeholder-gray-500 text-base resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
              
              {/* Bottom Controls */}
              <div className="flex justify-between items-center">
                <Button variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Text
                </Button>
                
                <div className="text-gray-400 text-sm">
                  {wordCount} / 12000
                </div>
              </div>
              
              <div className="text-center mt-6">
                <Button 
                  onClick={() => setActiveTab('settings')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Settings & Cast Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Settings Pane */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Settings</h3>
                
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">Project Name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">Aspect Ratio</label>
                  <ToggleGroup 
                    type="single" 
                    value={aspectRatio} 
                    onValueChange={(value) => value && setAspectRatio(value)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="16:9" className="bg-blue-600 text-white data-[state=on]:bg-blue-700">
                      16:9
                    </ToggleGroupItem>
                    <ToggleGroupItem value="1:1" className="bg-gray-800 text-gray-300 data-[state=on]:bg-blue-600">
                      1:1
                    </ToggleGroupItem>
                    <ToggleGroupItem value="9:16" className="bg-gray-800 text-gray-300 data-[state=on]:bg-blue-600">
                      9:16
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Video Style */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">Video Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    {videoStyles.map((style) => (
                      <Card 
                        key={style.id}
                        className={`cursor-pointer transition-all ${
                          videoStyle.toLowerCase() === style.id 
                            ? 'border-blue-500 bg-blue-900/20' 
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                        onClick={() => setVideoStyle(style.name)}
                      >
                        <CardContent className="p-3">
                          <img 
                            src={style.image} 
                            alt={style.name} 
                            className="w-full h-16 object-cover rounded mb-2"
                          />
                          <p className="text-white text-sm font-medium text-center">{style.name}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Style Reference */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">Style Reference</label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Drag & drop or click to upload</p>
                  </div>
                </div>

                {/* Cinematic Inspiration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">Cinematic Inspiration</label>
                  <Input
                    value={cinematicInspiration}
                    onChange={(e) => setCinematicInspiration(e.target.value)}
                    placeholder="e.g., Blade Runner, Casablanca..."
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Cast Pane */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Cast</h3>
                
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add character
                  </Button>
                  
                  <Card className="bg-gray-800 border-gray-700 flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face" 
                          alt="James Carter" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="text-white font-medium">James Carter</h4>
                          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 p-0 h-auto">
                            <Edit className="w-3 h-3 mr-1" />
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
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('concept')}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setActiveTab('breakdown')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Story Breakdown</h3>
              
              {/* Synopsis */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-white font-medium mb-3">Synopsis</h4>
                  <p className="text-gray-300 leading-relaxed">
                    James Carter, a weary businessman, enters a dimly lit bar after a long day. The atmosphere is heavy with jazz music and cigarette smoke. He approaches the bartender, seeking not just a drink, but a moment of respite from his troubled life. As he sits at the bar, the weight of his decisions begins to surface in this intimate setting.
                  </p>
                </CardContent>
              </Card>

              {/* Scene Breakdown */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-white font-medium mb-4">Scene 1 - James Enters the Bar</h4>
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    The heavy wooden door creaks open as James Carter steps into the smoky interior of the bar. Warm amber light spills across his tired face, revealing the stress lines that mark a man who has seen too much. The jazz trio in the corner provides a melancholic soundtrack to his entrance.
                  </p>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-gray-400 font-medium mb-2 uppercase tracking-wider text-sm">Scene Description</h5>
                    <p className="text-gray-300">
                      <span className="text-blue-400">@James Carter</span> enters through the main door, his silhouette framed against the street lights behind him. Camera follows him in a slow tracking shot as he surveys the bar, taking in the atmosphere. His expression shows fatigue mixed with determination as he approaches the bar counter.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between mt-8">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('settings')}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Start Generation
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Storyboard;
