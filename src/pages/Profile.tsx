import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ArrowLeft, User, BookOpen, Trophy, Target, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    scheduledItems: 0,
    joinedDays: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchProfile(user.id);
      fetchStats(user.id);
    };

    getUser();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async (userId: string) => {
    try {
      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('completed, created_at')
        .eq('user_id', userId);

      // Fetch schedule items
      const { data: scheduleItems } = await supabase
        .from('schedule_items')
        .select('id')
        .eq('user_id', userId);

      // Calculate join date (using user creation date)
      const joinDate = new Date(user?.created_at || new Date());
      const joinedDays = Math.floor((new Date().getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

      setStats({
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.completed).length || 0,
        scheduledItems: scheduleItems?.length || 0,
        joinedDays: Math.max(1, joinedDays)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_id: user.id,
          avatar_url: avatarUrl,
          display_name: displayName || null,
          bio: bio || null,
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading avatar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          bio: bio || null,
          avatar_url: profile?.avatar_url || null,
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div 
  className="profile-background min-h-screen p-4 bg-fixed bg-cover bg-center"
  style={{ backgroundImage: "url('../public/image.png')" }}
>
  <div className="max-w-4xl mx-auto"></div>
      <div className="profile-background min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/")}
              className="bg-teal-50 hover:bg-white-100 hover:text-indigo-600 text-indigo-600  border-teal-400 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info Card */}
            <div className="lg:col-span-2">
            <div className="bg-gradient-to-r from-teal-400 to-teal-400 rounded-xl p-[3px]">
              <Card className="profile-card">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your profile information and avatar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24 ring-4 ring-white shadow-lg">
                        <AvatarImage src={profile?.avatar_url || ""} alt="Avatar" />
                        <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {displayName?.charAt(0) || <User className="h-8 w-8" />}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute inset-0 cursor-pointer bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Upload className="h-6 w-6 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Click on the avatar to upload a new profile picture
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: JPG, PNG, GIF (max 5MB)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
  {/* Email (blue) */}
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      value={user?.email || ""}
      disabled
      className="bg-blue-50 border border-blue-300 text-blue-700 placeholder:text-blue-400"
    />
    <p className="text-xs text-muted-foreground">
      Email cannot be changed
    </p>
  </div>

  {/* Display Name (green) */}
  <div className="space-y-2">
    <Label htmlFor="displayName">Display Name</Label>
    <Input
      id="displayName"
      type="text"
      placeholder="Enter your display name"
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      className="bg-green-50 border border-green-300 text-green-700 placeholder:text-green-400 focus:border-green-400"
    />
  </div>

  {/* Bio (purple) */}
  <div className="space-y-2">
    <Label htmlFor="bio">Bio</Label>
    <Textarea
      id="bio"
      placeholder="Tell us about yourself..."
      value={bio}
      onChange={(e) => setBio(e.target.value)}
      rows={4}
      className="bg-purple-50 border border-purple-300 text-purple-700 placeholder:text-purple-400 focus:border-purple-400"
    />
  </div>
</div>


                  <div className="flex gap-4">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleSignOut}
                      className="hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    >
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
            {/* Stats Sidebar */}

            <div className="space-y-6">
              {/* User Stats */}
              <div className="bg-gradient-to-r from-teal-400 to-teal-400 rounded-xl p-[3px]">
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    Your Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Total Tasks</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      {stats.totalTasks}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Completed</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      {stats.completedTasks}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Scheduled Items</span>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                      {stats.scheduledItems}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Completion Rate</span>
                      <span className="text-sm font-bold text-green-600">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                        style={{width: `${completionRate}%`}}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
             
              {/* Achievements (placeholder for future feature) */}
              <div className="bg-gradient-to-r from-teal-400 to-teal-400 rounded-xl p-[3px]">
              <Card className="stat-card">
                <CardHeader className="pb-3">
                <CardTitle className="text-lg bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50">
                    <Trophy className="h-5 w-5 text-ypurple-600" />
                    <div>
                      <div className="text-sm font-medium text-purplr-800">First Task</div>
                      <div className="text-xs text-purple-600">Created your first task</div>
                    </div>
                  </div>
                  
                  {stats.completedTasks >= 5 && (
                    <div className="flex items-center gap-3 p-2 rounded-lg purple-50">
                      <Trophy className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="text-sm font-medium text-purple-800">Task Master</div>
                        <div className="text-xs text-purple-600">Completed 5+ tasks</div>
                      </div>
                    </div>
                  )}

                  {stats.completedTasks === 0 && stats.totalTasks === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Start completing tasks to earn achievements!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      
    </>
  );
};

export default Profile;
               