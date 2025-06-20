
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AuthHeader } from "@/components/AuthHeader";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader />

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center min-h-screen text-center px-4 sm:px-6 lg:px-8 pt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Create stunning AI videos with just a prompt.
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-12">
            Turn your imagination into reality in seconds.
          </p>
          <Button 
            size="lg"
            className="h-12 px-8 text-lg"
            onClick={handleGetStarted}
          >
            {user ? "Go to Dashboard" : "Get Started For Free"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Trust Bar */}
        <div className="w-full max-w-4xl mx-auto mt-24 py-8 border-t border-gray-100">
          <p className="text-sm text-gray-500 text-center">
            Powered by Stable Video Diffusion
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
