
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const AdminTesting = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Testing Dashboard</h1>
        <p className="text-gray-600">
          Testing interface temporarily disabled - use workspace for generation testing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Admin Testing Components
            <Badge variant="secondary">Disabled</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 mb-4">
            Admin testing components have been removed as part of the architecture cleanup.
            Use the main workspace for testing generation functionality.
          </p>
          <Button onClick={() => window.location.href = '/workspace'}>
            Go to Workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
