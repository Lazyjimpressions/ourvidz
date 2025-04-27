
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <section className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Base UI System</h1>
          <p className="text-lg text-muted-foreground">
            A modern, consistent design system built with shadcn/ui
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Components</h2>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Buttons</h3>
              <div className="flex gap-4">
                <Button>Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Input Field</h3>
              <Input placeholder="Enter some text..." className="max-w-sm" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Dropdown</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Open Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Option 1</DropdownMenuItem>
                  <DropdownMenuItem>Option 2</DropdownMenuItem>
                  <DropdownMenuItem>Option 3</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Loading Spinners</h3>
              <div className="flex gap-4 items-center">
                <LoadingSpinner size="sm" />
                <LoadingSpinner size="md" />
                <LoadingSpinner size="lg" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Toast Notification</h3>
              <Button 
                onClick={() => {
                  toast({
                    title: "Action completed",
                    description: "Your action has been successfully completed.",
                  });
                }}
              >
                Show Toast
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
