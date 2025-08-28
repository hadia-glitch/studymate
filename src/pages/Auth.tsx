// ...keep all imports and SVG definitions removed as they are no longer needed
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();
  const { toast } = useToast();

  const formRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState<number>(0);

  useEffect(() => {
    if (formRef.current) setFormHeight(formRef.current.scrollHeight);
  }, [activeTab, email, password, displayName]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast({ title: "Error signing in", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Welcome back!", description: "Successfully signed in to StudyMate." });
        navigate("/");
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } },
      });
      if (error) toast({ title: "Error creating account", description: error.message, variant: "destructive" });
      else toast({ title: "Account created!", description: "Please check your email to confirm." });
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  return (
    <div 
    className="profile-background min-h-screen p-4 bg-fixed bg-cover bg-center"
    style={{ backgroundImage: "url('../public/3.png')" }}
  >
    <div className="min-h-screen flex flex-col items-center py-12 px-6">
      {/* Header with semi-transparent background */}
      <header className="mb-8 text-center max-w-3xl">
        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <div className="inline-flex items-center gap-3 mb-2">
          <BookOpen className="h-14 w-14 text-teal-900" />

            <h1 className="text-6xl font-extrabold tracking-tight font-serif bg-gradient-to-r from-purple-700 via-teal-700 to-indigo-700 bg-clip-text text-transparent">
  StudyMate
</h1>

          </div>
          <p className="text-lg text-slate-600 max-w-xl mx-auto font-medium">
            AI-powered study companion — plan, track, and focus with confidence.
          </p>
        </div>
      </header>

      {/* Auth + GIF container */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-stretch">
        {/* Form side */}
        <motion.div layout className={`${activeTab === "signin" ? "order-1" : "order-2"} flex-1`}>
          <Card className="w-full bg-slate-900 text-slate-50 shadow-2xl rounded-none h-full">
            <CardHeader className="text-center text-slate-50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="rounded-full bg-slate-800 p-2"><BookOpen className="h-7 w-7 text-slate-200"/></div>
                <h2 className="text-2xl font-bold">
                  {activeTab === "signin" ? "Welcome back!" : "Let's get working!"}
                </h2>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800 rounded-md p-1 mb-6">
                  <TabsTrigger value="signin" className="bg-transparent text-slate-200 data-[state=active]:bg-slate-700">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="bg-transparent text-slate-200 data-[state=active]:bg-slate-700">Sign Up</TabsTrigger>
                </TabsList>

                <div className="flex-1 flex flex-col justify-center">
                  <TabsContent value="signin" className="flex-1 flex items-center">
                    <form onSubmit={handleSignIn} className="space-y-6 w-full">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-slate-800 text-slate-100 border-slate-700"/>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-slate-800 text-slate-100 border-slate-700"/>
                      </div>
                      {/* Spacer to match signup form height */}
                      <div className="h-16"></div>
                      <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-600" disabled={isLoading}>
                        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Signing In...</>) : ("Sign In")}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="flex-1 flex items-center">
                    <form onSubmit={handleSignUp} className="space-y-6 w-full">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input id="displayName" type="text" placeholder="Enter your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="bg-slate-800 text-slate-100 border-slate-700"/>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signupEmail">Email</Label>
                        <Input id="signupEmail" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-slate-800 text-slate-100 border-slate-700"/>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signupPassword">Password</Label>
                        <Input id="signupPassword" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-slate-800 text-slate-100 border-slate-700"/>
                      </div>
                      <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-600" disabled={isLoading}>
                        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creating Account...</>) : ("Create Account")}
                      </Button>
                    </form>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* GIF side */}
        <motion.div layout className={`${activeTab === "signin" ? "order-2" : "order-1"} flex-1`}>
          <div className="w-full h-full bg-white shadow-xl rounded-none flex items-center justify-center p-4">
            <img 
              src="/bookgif.gif" 
              alt="Study Animation" 
              className="w-full h-auto max-w-none object-contain" 
              style={{ minHeight: '400px', maxHeight: '600px' }}
            />
          </div>
        </motion.div>
      </div>
    </div>
     </div>
  );
};

export default Auth;