
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Google, Mail } from "lucide-react";

const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Card className="w-full max-w-[400px] p-6">
        <CardContent className="space-y-6 pt-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome to VideoAI</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue</p>
          </div>

          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-center gap-2">
              <Google className="h-5 w-5" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
              />
            </div>

            <Button className="w-full justify-center gap-2">
              <Mail className="h-5 w-5" />
              Continue with Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
