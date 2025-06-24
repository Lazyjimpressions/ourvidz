
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, User, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type WorkspaceMode = 'image' | 'video';

const Workspace = () => {
  const [searchParams] = useSearchParams();
  const { profile, isSubscribed } = useAuth();
  
  // Get mode from URL params, fallback to 'image'
  const initialMode = (searchParams.get('mode') as WorkspaceMode) || 'image';
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  
  // Form state that persists across mode changes
  const [formState, setFormState] = useState({
    imagePrompt: '',
    videoPrompt: '',
    imageAspectRatio: '16:9',
    videoAspectRatio: '16:9',
    shotType: '',
    angle: '',
    style: '',
    duration: '5s'
  });

  // Update mode when URL params change
  useEffect(() => {
    const urlMode = (searchParams.get('mode') as WorkspaceMode) || 'image';
    setMode(urlMode);
  }, [searchParams]);

  const handleModeSwitch = (newMode: WorkspaceMode) => {
    setMode(newMode);
    // Update URL without navigation
    window.history.replaceState({}, '', `/workspace?mode=${newMode}`);
  };

  const updateFormState = (field: string, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // Placeholder images for scattered layout
  const placeholderImages = [
    "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=120&h=120&fit=crop", 
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=140&h=140&fit=crop",
    "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=130&h=130&fit=crop",
    "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=160&h=160&fit=crop"
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Top Header */}
      <header className="bg-[#111111] border-b border-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left - Back to Dashboard */}
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Gen Space</span>
          </Link>

          {/* Right - User Info */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
            >
              Upgrade
            </Button>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <CreditCard className="w-4 h-4" />
                <span>Credits: {profile?.token_balance || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isSubscribed ? 'Pro' : 'Free'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <User className="w-4 h-4" />
                <span>{profile?.username || 'User'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section with Scattered Images */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
          {/* Scattered Background Images */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Mobile-first responsive positioning */}
            <img 
              src={placeholderImages[0]} 
              alt="" 
              className="absolute w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-lg opacity-20 top-1/4 left-4 md:left-12 lg:left-24"
            />
            <img 
              src={placeholderImages[1]} 
              alt="" 
              className="absolute w-14 h-14 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-lg opacity-20 top-1/3 right-6 md:right-16 lg:right-32"
            />
            <img 
              src={placeholderImages[2]} 
              alt="" 
              className="absolute w-18 h-18 md:w-22 md:h-22 lg:w-26 lg:h-26 rounded-lg opacity-20 bottom-1/3 left-8 md:left-20 lg:left-40"
            />
            <img 
              src={placeholderImages[3]} 
              alt="" 
              className="absolute w-15 h-15 md:w-19 md:h-19 lg:w-22 lg:h-22 rounded-lg opacity-20 top-1/2 right-4 md:right-12 lg:right-28"
            />
            <img 
              src={placeholderImages[4]} 
              alt="" 
              className="absolute w-17 h-17 md:w-21 md:h-21 lg:w-25 lg:h-25 rounded-lg opacity-20 bottom-1/4 right-12 md:right-24 lg:right-48"
            />
          </div>

          {/* Centered Content */}
          <div className="text-center z-10 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {mode === 'image' 
                ? "Let's start with some image storming"
                : "Let's start creating some videos"
              }
            </h1>
            <p className="text-lg md:text-xl text-gray-400">
              {mode === 'image'
                ? "Type your prompt, set your style, and generate your image"
                : "Select or upload an image, add a prompt, and watch it go"
              }
            </p>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-[#111111] border-t border-gray-800 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant={mode === 'image' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleModeSwitch('image')}
                className={mode === 'image' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
              >
                IMAGE
              </Button>
              <Button
                variant={mode === 'video' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleModeSwitch('video')}
                className={mode === 'video' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
              >
                VIDEO
              </Button>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Prompt Input */}
              <div className="lg:col-span-2">
                <Label htmlFor="prompt" className="text-gray-300 mb-2 block">Prompt</Label>
                <Input
                  id="prompt"
                  value={mode === 'image' ? formState.imagePrompt : formState.videoPrompt}
                  onChange={(e) => updateFormState(mode === 'image' ? 'imagePrompt' : 'videoPrompt', e.target.value)}
                  placeholder={mode === 'image' ? "Describe the image you want..." : "Describe the video you want..."}
                  className="bg-[#0a0a0a] border-gray-700 text-white placeholder-gray-500"
                />
              </div>

              {mode === 'image' ? (
                <>
                  {/* Image Mode Controls */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">Aspect Ratio</Label>
                    <Select 
                      value={formState.imageAspectRatio} 
                      onValueChange={(value) => updateFormState('imageAspectRatio', value)}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Shot Type</Label>
                    <Select 
                      value={formState.shotType} 
                      onValueChange={(value) => updateFormState('shotType', value)}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="close-up">Close-up</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="wide">Wide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Angle</Label>
                    <Select 
                      value={formState.angle} 
                      onValueChange={(value) => updateFormState('angle', value)}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eye-level">Eye Level</SelectItem>
                        <SelectItem value="low">Low Angle</SelectItem>
                        <SelectItem value="high">High Angle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Style</Label>
                    <Select 
                      value={formState.style} 
                      onValueChange={(value) => updateFormState('style', value)}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Realistic</SelectItem>
                        <SelectItem value="artistic">Artistic</SelectItem>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  {/* Video Mode Controls */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 bg-[#0a0a0a] border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Image
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 bg-[#0a0a0a] border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Model</Label>
                    <Select defaultValue="ltvx-turbo">
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ltvx-turbo">LTVX Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Aspect Ratio</Label>
                    <Select 
                      value={formState.videoAspectRatio} 
                      onValueChange={(value) => updateFormState('videoAspectRatio', value)}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Duration</Label>
                    <Select 
                      value={formState.duration} 
                      onValueChange={(value) => updateFormState('duration', value)}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3s">3s</SelectItem>
                        <SelectItem value="5s">5s</SelectItem>
                        <SelectItem value="10s">10s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Generate Button */}
            <div className="mt-6 flex justify-center">
              <Button 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-3"
              >
                Generate {mode === 'image' ? 'Image' : 'Video'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
