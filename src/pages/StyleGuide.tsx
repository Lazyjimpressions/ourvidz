import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  User,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Section wrapper component
const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="space-y-4 pb-8 border-b border-border/30">
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && <p className="text-[10px] text-muted-foreground mt-1">{description}</p>}
    </div>
    {children}
  </section>
);

// Code block with copy button
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'tsx' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-black/40 border border-border/30 rounded-md p-3 text-[10px] font-mono text-muted-foreground overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};

// Color swatch component
const ColorSwatch: React.FC<{ name: string; token: string; value: string }> = ({
  name,
  token,
  value,
}) => (
  <div className="flex items-center gap-3">
    <div
      className="w-10 h-10 rounded-md border border-border/50 shadow-sm"
      style={{ backgroundColor: value }}
    />
    <div>
      <p className="text-[11px] font-medium">{name}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{token}</p>
    </div>
  </div>
);

export default function StyleGuide() {
  const [sliderValue, setSliderValue] = useState([50]);
  const [switchValue, setSwitchValue] = useState(false);
  const [selectValue, setSelectValue] = useState('option1');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 h-12 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-semibold">Style Guide</h1>
              <p className="text-[9px] text-muted-foreground">OurVidz Design System v1.0</p>
            </div>
          </div>
          <a
            href="/docs/DESIGN_SYSTEM.md"
            target="_blank"
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View Documentation <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Typography */}
        <Section title="Typography" description="Text styles using Inter font family">
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-baseline gap-4">
                <span className="w-20 text-[10px] text-muted-foreground">Display</span>
                <span className="text-lg font-semibold">Page Title (18px/600)</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-20 text-[10px] text-muted-foreground">Heading</span>
                <span className="text-sm font-semibold">Section Header (14px/600)</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-20 text-[10px] text-muted-foreground">Body</span>
                <span className="text-xs">Body text for descriptions (12px/400)</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-20 text-[10px] text-muted-foreground">Label</span>
                <span className="text-[11px] font-medium">Form Label (11px/500)</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-20 text-[10px] text-muted-foreground">Caption</span>
                <span className="text-[10px]">Helper text and captions (10px/400)</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-20 text-[10px] text-muted-foreground">Micro</span>
                <span className="text-[9px]">Badges and chips (9px/400)</span>
              </div>
            </div>
            <CodeBlock
              code={`// Typography classes
<h1 className="text-lg font-semibold">Display</h1>
<h2 className="text-sm font-semibold">Heading</h2>
<p className="text-xs">Body</p>
<label className="text-[11px] font-medium">Label</label>
<span className="text-[10px]">Caption</span>
<span className="text-[9px]">Micro</span>`}
            />
          </div>
        </Section>

        {/* Colors */}
        <Section title="Colors" description="Dark theme color palette">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Background" token="--background" value="hsl(220, 13%, 9%)" />
            <ColorSwatch name="Card" token="--card" value="hsl(220, 13%, 11%)" />
            <ColorSwatch name="Muted" token="--muted" value="hsl(220, 13%, 14%)" />
            <ColorSwatch name="Border" token="--border" value="hsl(220, 13%, 16%)" />
            <ColorSwatch name="Foreground" token="--foreground" value="hsl(0, 0%, 95%)" />
            <ColorSwatch name="Muted FG" token="--muted-foreground" value="hsl(220, 9%, 55%)" />
            <ColorSwatch name="Primary" token="--primary" value="#3b82f6" />
            <ColorSwatch name="Secondary" token="--secondary" value="#10b981" />
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing" description="4px base unit spacing scale">
          <div className="flex flex-wrap gap-4 items-end">
            {[
              { name: 'xs', value: '4px', class: 'w-1' },
              { name: 'sm', value: '8px', class: 'w-2' },
              { name: 'md', value: '12px', class: 'w-3' },
              { name: 'lg', value: '16px', class: 'w-4' },
              { name: 'xl', value: '24px', class: 'w-6' },
              { name: '2xl', value: '32px', class: 'w-8' },
            ].map((item) => (
              <div key={item.name} className="text-center">
                <div className={cn('h-8 bg-primary rounded', item.class)} />
                <p className="text-[10px] font-medium mt-1">{item.name}</p>
                <p className="text-[9px] text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" description="All button variants and sizes">
          <div className="space-y-6">
            {/* Variants */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Variants</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Sizes</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="lg">Large (h-9)</Button>
                <Button size="default">Default (h-8)</Button>
                <Button size="sm">Small (h-7)</Button>
                <Button size="xs">XS (h-6)</Button>
                <Button size="icon">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon-sm">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">With Icons</p>
              <div className="flex flex-wrap gap-2">
                <Button>
                  <Plus className="w-3.5 h-3.5" />
                  Create
                </Button>
                <Button variant="secondary">
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </Button>
                <Button variant="outline">
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
                <Button disabled>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading...
                </Button>
              </div>
            </div>

            <CodeBlock
              code={`<Button variant="default" size="default">Default</Button>
<Button variant="secondary" size="sm">Small</Button>
<Button size="icon"><Plus className="w-3.5 h-3.5" /></Button>`}
            />
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Form Inputs" description="Input, textarea, and select components">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="input-demo">Text Input</Label>
                <Input id="input-demo" placeholder="Enter text..." />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="input-icon">With Icon</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input id="input-icon" className="pl-8" placeholder="Search..." />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="select-demo">Select</Label>
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="textarea-demo">Textarea</Label>
                <Textarea
                  id="textarea-demo"
                  placeholder="Enter description..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Checkbox</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="check1" />
                  <label htmlFor="check1" className="text-xs">
                    Enable feature
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Switch</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={switchValue} onCheckedChange={setSwitchValue} />
                  <span className="text-xs">{switchValue ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Sliders */}
        <Section title="Sliders" description="Range input controls">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Min</span>
                <span>{sliderValue[0]}%</span>
                <span>Max</span>
              </div>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <CodeBlock
              code={`<Slider
  value={[50]}
  onValueChange={setValue}
  min={0}
  max={100}
  step={1}
/>`}
            />
          </div>
        </Section>

        {/* Badges & Chips */}
        <Section title="Badges & Chips" description="Status indicators and tags">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="chip">Genre</span>
              <span className="chip chip-active">Active</span>
              <span className="px-2 py-0.5 text-[9px] bg-green-500/20 text-green-400 rounded-full">
                Online
              </span>
              <span className="px-2 py-0.5 text-[9px] bg-amber-500/20 text-amber-400 rounded-full">
                Pending
              </span>
            </div>
          </div>
        </Section>

        {/* Tabs */}
        <Section title="Tabs" description="Tab navigation component">
          <Tabs defaultValue="tab1" className="max-w-md">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tab1">Identity</TabsTrigger>
              <TabsTrigger value="tab2">Visuals</TabsTrigger>
              <TabsTrigger value="tab3">Style</TabsTrigger>
              <TabsTrigger value="tab4">Media</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="mt-4">
              <p className="text-xs text-muted-foreground">Identity tab content</p>
            </TabsContent>
            <TabsContent value="tab2" className="mt-4">
              <p className="text-xs text-muted-foreground">Visuals tab content</p>
            </TabsContent>
            <TabsContent value="tab3" className="mt-4">
              <p className="text-xs text-muted-foreground">Style tab content</p>
            </TabsContent>
            <TabsContent value="tab4" className="mt-4">
              <p className="text-xs text-muted-foreground">Media tab content</p>
            </TabsContent>
          </Tabs>
        </Section>

        {/* Icons */}
        <Section title="Icons" description="Lucide React icons at different sizes">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Button size (14px / size-3.5)</p>
              <div className="flex gap-3">
                <Sparkles className="w-3.5 h-3.5" />
                <Wand2 className="w-3.5 h-3.5" />
                <Heart className="w-3.5 h-3.5" />
                <Edit className="w-3.5 h-3.5" />
                <Trash2 className="w-3.5 h-3.5" />
                <Settings className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Standard size (16px / size-4)</p>
              <div className="flex gap-3">
                <ImageIcon className="w-4 h-4" />
                <Video className="w-4 h-4" />
                <User className="w-4 h-4" />
                <Upload className="w-4 h-4" />
                <Download className="w-4 h-4" />
                <X className="w-4 h-4" />
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Small size (12px / size-3)</p>
              <div className="flex gap-3">
                <Check className="w-3 h-3" />
                <X className="w-3 h-3" />
                <Plus className="w-3 h-3" />
              </div>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards" description="Card container examples">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-card border border-border/50 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold">Basic Card</h3>
              <p className="text-[10px] text-muted-foreground">
                Simple card with border and padding.
              </p>
            </div>

            <div className="bg-secondary/20 border border-border/30 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold">Muted Card</h3>
              <p className="text-[10px] text-muted-foreground">
                Card with subtle background.
              </p>
            </div>

            <div className="bg-card border border-primary/30 rounded-lg p-4 space-y-2 ring-1 ring-primary/20">
              <h3 className="text-xs font-semibold text-primary">Selected Card</h3>
              <p className="text-[10px] text-muted-foreground">
                Card with primary accent border.
              </p>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-8 pb-12 text-center">
          <p className="text-[10px] text-muted-foreground">
            OurVidz Design System v1.0 •{' '}
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Built with Claude Code
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
