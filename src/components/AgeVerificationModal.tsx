import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgeVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [birthDate, setBirthDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile, updateProfile, isAdmin } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !birthDate) return;

    setIsSubmitting(true);
    
    try {
      // Calculate age
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      if (age < 18) {
        toast({
          title: "Age Verification Failed",
          description: "You must be at least 18 years old to access adult content.",
          variant: "destructive",
        });
        return;
      }

      // Update profile with birth date
      const { error } = await supabase
        .from('profiles')
        .update({ birth_date: birthDate })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local profile state
      await updateProfile({ birth_date: birthDate } as any);

      toast({
        title: "Age Verified",
        description: "You can now access all content on the platform.",
      });
      
      onClose();
    } catch (error) {
      console.error('Age verification error:', error);
      toast({
        title: "Verification Failed", 
        description: "There was an error verifying your age. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render modal for admins
  if (isAdmin) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Age Verification Required
          </DialogTitle>
        </DialogHeader>
        
        <Card className="border-amber-200/20 bg-amber-50/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <p className="text-sm text-foreground">
                Adult content is restricted to users 18 and older.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="birthdate" className="text-sm font-medium">
                  Date of Birth
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!birthDate || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify Age'}
                </Button>
              </div>
            </form>
            
            <p className="text-xs text-muted-foreground mt-4">
              Your birth date is used solely for age verification and is stored securely.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};