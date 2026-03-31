'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@sly/ui';
import { Input } from '@sly/ui';
import { Label } from '@sly/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sly/ui';
import { Loader2, Zap } from 'lucide-react';
import Link from 'next/link';
import { OAuthButtons } from '@/components/auth/oauth-buttons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check if user has a tenant — if not, redirect to setup/onboarding
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const meRes = await fetch(`${apiUrl}/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.session.access_token}` },
      });
      if (meRes.ok) {
        const meJson = await meRes.json();
        const me = meJson.data || meJson;
        if (!me.tenant) {
          router.push('/auth/setup');
          return;
        }
      } else {
        router.push('/auth/setup');
        return;
      }
    } catch {
      // API unreachable — try setup
      router.push('/auth/setup');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 bg-primary"
                style={{
                  WebkitMaskImage: 'url(/sly-logo.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: 'url(/sly-logo.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                }}
              />
              <span className="text-2xl font-bold text-foreground">Sly</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to the Agentic Economy Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <OAuthButtons mode="login" />

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {process.env.NEXT_PUBLIC_CLOSED_BETA === 'true' ? (
              <>
                Don't have access yet?{' '}
                <Link href="/auth/signup" className="text-primary hover:underline">
                  Apply for the beta
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

