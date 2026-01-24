/**
 * Supabase Client Configuration
 * 
 * Setup:
 * 1. Go to supabase.com and create a project
 * 2. Go to Project Settings → API
 * 3. Copy Project URL and anon key
 * 4. Set environment variables in .env
 */

import { createClient } from "@supabase/supabase-js";

// Environment variables (set these in .env or Vercel dashboard)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const AUTH_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!AUTH_CONFIGURED) {
    console.warn("⚠️ Supabase credentials not configured. Auth features disabled.");
}

// Only create client if credentials are available
export const supabase = AUTH_CONFIGURED 
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ========================================
// AUTH TYPES
// ========================================

export interface UserProfile {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    total_games: number;
    wins: number;
    total_prestige: number;
    created_at: string;
}

// ========================================
// AUTH FUNCTIONS
// ========================================

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: "Auth not configured" };
    }
    
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin,
            },
        });
        
        if (error) {
            console.error("[Auth] Google sign in error:", error.message);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    } catch (e) {
        console.error("[Auth] Unexpected error:", e);
        return { success: false, error: "Unexpected error" };
    }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
    if (!supabase) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Try to get profile from database
    const { data: profile } = await supabase
        .from("player_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
    
    if (profile) {
        return profile as UserProfile;
    }
    
    // Create new profile if doesn't exist
    const newProfile: Partial<UserProfile> = {
        id: user.id,
        email: user.email || "",
        display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Player",
        avatar_url: user.user_metadata?.avatar_url || null,
        total_games: 0,
        wins: 0,
        total_prestige: 0,
    };
    
    const { data: createdProfile, error } = await supabase
        .from("player_profiles")
        .insert(newProfile)
        .select()
        .single();
    
    if (error) {
        console.error("[Auth] Failed to create profile:", error);
        return null;
    }
    
    return createdProfile as UserProfile;
}

/**
 * Update player stats after a game
 */
export async function updatePlayerStats(
    userId: string,
    won: boolean,
    prestige: number
): Promise<void> {
    if (!supabase) return;
    
    const { error } = await supabase.rpc("update_player_stats", {
        p_user_id: userId,
        p_won: won,
        p_prestige: prestige,
    });
    
    if (error) {
        console.error("[Auth] Failed to update stats:", error);
    }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    if (!supabase) {
        return () => {}; // No-op unsubscribe
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[Auth] State changed:", event);
        
        if (session?.user) {
            const profile = await getCurrentUser();
            callback(profile);
        } else {
            callback(null);
        }
    });
    
    return () => subscription.unsubscribe();
}

/**
 * Check if Supabase is configured
 */
export function isAuthConfigured(): boolean {
    return AUTH_CONFIGURED;
}
