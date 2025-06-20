
import { Video, Check, Star, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthHeader } from "@/components/AuthHeader";
import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";

const Pricing = () => {
  const { user, profile } = useAuth();

  const PricingContent = () => (
    <div className="container mx-auto px-4 py-16 pt-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose your plan</h1>
        <p className="text-gray-600">Get started with the perfect plan for your needs</p>
        {user && profile && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Current plan: <span className="font-medium capitalize">{profile.subscription_status}</span>
              {" | "}Credits remaining: <span className="font-medium">{profile.token_balance}</span>
            </p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Starter Plan */}
        <Card className="relative p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Starter</h3>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">$9.99</span>
              <span className="text-gray-500 ml-2">/month</span>
            </div>
            <Button className="w-full" variant="outline">
              {user ? "Select Plan" : "Get Started"}
            </Button>
            <div className="space-y-3 pt-4">
              <Feature icon={Video} text="10 video credits per month" />
              <Feature icon={Star} text="720p video export" />
              <Feature icon={Check} text="Basic AI features" />
              <Feature icon={Check} text="Email support" />
            </div>
          </div>
        </Card>

        {/* Pro Plan */}
        <Card className="relative p-6 hover:shadow-lg transition-shadow duration-300 border-primary">
          <Badge className="absolute -top-2 right-4" variant="secondary">
            Most Popular
          </Badge>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Pro</h3>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">$19.99</span>
              <span className="text-gray-500 ml-2">/month</span>
            </div>
            <Button className="w-full">
              {user ? "Select Plan" : "Get Started"}
            </Button>
            <div className="space-y-3 pt-4">
              <Feature icon={Video} text="25 video credits per month" />
              <Feature icon={Star} text="1080p video export" />
              <Feature icon={Check} text="Advanced AI features" />
              <Feature icon={Award} text="Priority support" />
              <Feature icon={Check} text="Custom branding" />
            </div>
          </div>
        </Card>

        {/* Creator Plan */}
        <Card className="relative p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Creator</h3>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">$39.99</span>
              <span className="text-gray-500 ml-2">/month</span>
            </div>
            <Button className="w-full" variant="outline">
              {user ? "Select Plan" : "Get Started"}
            </Button>
            <div className="space-y-3 pt-4">
              <Feature icon={Video} text="60 video credits per month" />
              <Feature icon={Star} text="4K video export" />
              <Feature icon={Check} text="Enterprise AI features" />
              <Feature icon={Award} text="24/7 priority support" />
              <Feature icon={Check} text="API access" />
              <Feature icon={Check} text="Custom integrations" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  if (user) {
    return (
      <PortalLayout title="Pricing Plans">
        <div className="min-h-screen bg-gray-50">
          <PricingContent />
        </div>
      </PortalLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      <PricingContent />
    </div>
  );
};

const Feature = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-5 h-5 text-primary" />
    <span className="text-gray-600">{text}</span>
  </div>
);

export default Pricing;
