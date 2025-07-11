import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  id: string;
  prompt_text: string;
  test_tier: 'artistic' | 'explicit' | 'unrestricted';
  test_series: string;
  model_type: 'SDXL' | 'WAN' | 'LORA';
  overall_quality: number;
  technical_quality: number;
  content_quality: number;
  consistency: number;
  notes: string;
  created_at: string;
  image_id?: string;
  image_url?: string;
}

interface TestSeries {
  id: string;
  name: string;
  description: string;
  prompts: {
    artistic: string;
    explicit: string;
    unrestricted: string;
  };
}

const TEST_SERIES: TestSeries[] = [
  {
    id: 'couples-intimacy',
    name: 'Couples Intimacy Progression',
    description: 'Basic couple scenes progressing through tiers',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate couple portrait, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult content, passionate intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  },
  {
    id: 'shower-bath',
    name: 'Shower/Bath Scenes',
    description: 'Wet scenes with steamy atmosphere',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate couple shower scene, steamy atmosphere, soft lighting, artistic composition, tasteful nudity, emotional connection, natural skin tones, professional camera, shallow depth of field, warm lighting, romantic atmosphere, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple shower scene, steamy atmosphere, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult shower scene, steamy atmosphere, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  },
  {
    id: 'bedroom-intimacy',
    name: 'Bedroom Intimacy',
    description: 'Classic bedroom scenes',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate couple bedroom scene, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple bedroom scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult bedroom scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  },
  {
    id: 'multi-person',
    name: 'Multi-Person Scenes',
    description: 'Group scenes and complex interactions',
    prompts: {
      artistic: 'score_9, score_8_up, masterpiece, best quality, intimate group scene, soft natural lighting, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography',
      explicit: 'score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate group scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content',
      unrestricted: 'score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult group scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism'
    }
  }
];

export function PromptTestingTab() {
  const [selectedSeries, setSelectedSeries] = useState<string>('couples-intimacy');
  const [selectedTier, setSelectedTier] = useState<'artistic' | 'explicit' | 'unrestricted'>('artistic');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load test results on component mount
  useEffect(() => {
    loadTestResults();
  }, []);

  // Update current prompt when series or tier changes
  useEffect(() => {
    const series = TEST_SERIES.find(s => s.id === selectedSeries);
    if (series) {
      setCurrentPrompt(series.prompts[selectedTier]);
    }
  }, [selectedSeries, selectedTier]);

  const loadTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('model_test_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestResults((data || []).map(item => ({
        ...item,
        test_tier: item.test_tier as 'artistic' | 'explicit' | 'unrestricted',
        model_type: item.model_type as 'SDXL' | 'WAN' | 'LORA'
      })));
    } catch (error) {
      console.error('Error loading test results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test results',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async () => {
    if (!currentPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'sdxl_image_fast',
          metadata: {
            prompt: currentPrompt,
            enhancement_tier: selectedTier,
            test_series: selectedSeries,
            test_tier: selectedTier,
            queue: 'sdxl_queue'
          }
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Image generated successfully',
      });

      // Auto-save test result
      await saveTestResult({
        prompt_text: currentPrompt,
        test_tier: selectedTier,
        test_series: selectedSeries,
        model_type: 'SDXL',
        overall_quality: 0,
        technical_quality: 0,
        content_quality: 0,
        consistency: 0,
        notes: '',
        created_at: new Date().toISOString(),
        image_url: result.image_url
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate image',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveTestResult = async (result: Omit<TestResult, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('model_test_results')
        .insert([result])
        .select()
        .single();

      if (error) throw error;

      setTestResults(prev => [data as TestResult, ...prev]);
      toast({
        title: 'Success',
        description: 'Test result saved',
      });
    } catch (error) {
      console.error('Error saving test result:', error);
      toast({
        title: 'Error',
        description: 'Failed to save test result',
        variant: 'destructive'
      });
    }
  };

  const updateTestResult = async (id: string, updates: Partial<TestResult>) => {
    try {
      const { data, error } = await supabase
        .from('model_test_results')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTestResults(prev => prev.map(r => r.id === id ? data as TestResult : r));
      toast({
        title: 'Success',
        description: 'Test result updated',
      });
    } catch (error) {
      console.error('Error updating test result:', error);
      toast({
        title: 'Error',
        description: 'Failed to update test result',
        variant: 'destructive'
      });
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'artistic': return 'bg-blue-100 text-blue-800';
      case 'explicit': return 'bg-yellow-100 text-yellow-800';
      case 'unrestricted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Model Testing Framework</h2>
        <Badge variant="outline">
          {testResults.length} Tests Completed
        </Badge>
      </div>

      <Tabs defaultValue="generator" className="w-full">
        <TabsList>
          <TabsTrigger value="generator">Prompt Generator</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Series Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Test Series</label>
                  <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_SERIES.map(series => (
                        <SelectItem key={series.id} value={series.id}>
                          {series.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Content Tier</label>
                  <Select value={selectedTier} onValueChange={(value: 'artistic' | 'explicit' | 'unrestricted') => setSelectedTier(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="artistic">Artistic (Tasteful)</SelectItem>
                      <SelectItem value="explicit">Explicit (Direct)</SelectItem>
                      <SelectItem value="unrestricted">Unrestricted (Maximum)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Series Description</label>
                <p className="text-sm text-gray-600 mt-1">
                  {TEST_SERIES.find(s => s.id === selectedSeries)?.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Generated Prompt</label>
                <Textarea
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder="Enter or modify the prompt..."
                  className="min-h-[100px] font-mono text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {Math.ceil(currentPrompt.length / 3)} tokens (max 75)
                  </span>
                  <Badge 
                    variant={currentPrompt.length > 225 ? 'destructive' : 'secondary'}
                  >
                    {currentPrompt.length > 225 ? 'Token Limit Exceeded' : 'Within Limits'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={generateImage}
                  disabled={isGenerating || currentPrompt.length > 225}
                  className="flex-1"
                >
                  {isGenerating ? 'Generating...' : 'Generate Image'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(currentPrompt)}
                >
                  Copy Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTierColor(result.test_tier)}>
                            {result.test_tier}
                          </Badge>
                          <Badge variant="outline">
                            {TEST_SERIES.find(s => s.id === result.test_series)?.name}
                          </Badge>
                          <Badge variant="secondary">
                            {result.model_type}
                          </Badge>
                        </div>
                        <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                          {result.prompt_text}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-medium">Overall Quality</label>
                        <Select 
                          value={result.overall_quality.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { overall_quality: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Technical Quality</label>
                        <Select 
                          value={result.technical_quality.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { technical_quality: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Content Quality</label>
                        <Select 
                          value={result.content_quality.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { content_quality: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Consistency</label>
                        <Select 
                          value={result.consistency.toString()} 
                          onValueChange={(value) => updateTestResult(result.id, { consistency: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                <span className={getQualityColor(num)}>{num}/10</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium">Notes</label>
                      <Textarea
                        value={result.notes || ''}
                        onChange={(e) => updateTestResult(result.id, { notes: e.target.value })}
                        placeholder="Add notes about this test result..."
                        className="min-h-[60px] text-sm"
                      />
                    </div>

                    {result.image_url && (
                      <div>
                        <label className="text-xs font-medium">Generated Image</label>
                        <img 
                          src={result.image_url} 
                          alt="Generated test image"
                          className="max-w-xs rounded border"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testing Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Quality by Tier</h3>
                  <div className="space-y-2">
                    {['artistic', 'explicit', 'unrestricted'].map(tier => {
                      const tierResults = testResults.filter(r => r.test_tier === tier);
                      const avgQuality = tierResults.length > 0 
                        ? tierResults.reduce((sum, r) => sum + r.overall_quality, 0) / tierResults.length 
                        : 0;
                      return (
                        <div key={tier} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{tier}</span>
                          <span className={`text-sm font-medium ${getQualityColor(Math.round(avgQuality))}`}>
                            {avgQuality.toFixed(1)}/10
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Series Progress</h3>
                  <div className="space-y-2">
                    {TEST_SERIES.map(series => {
                      const seriesResults = testResults.filter(r => r.test_series === series.id);
                      const completed = seriesResults.length;
                      const total = 3; // 3 tiers per series
                      const percentage = (completed / total) * 100;
                      return (
                        <div key={series.id}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{series.name}</span>
                            <span>{completed}/{total}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Recent Activity</h3>
                  <div className="space-y-2">
                    {testResults.slice(0, 5).map(result => (
                      <div key={result.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className={getTierColor(result.test_tier)}>
                            {result.test_tier}
                          </Badge>
                          <span className={getQualityColor(result.overall_quality)}>
                            {result.overall_quality}/10
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(result.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 