/**
 * Asset Loader - Preloads game assets
 * 
 * Usage:
 *   await AssetLoader.loadAll((progress) => console.log(progress));
 *   const sprite = AssetLoader.getTexture("hero");
 */

import * as PIXI from "pixi.js";

export const GAME_VERSION = "v0.4";

// Asset manifest - add new assets here
export type AssetManifest = {
    textures: Record<string, string>;
    spritesheets: Record<string, string>;
    audio: Record<string, string>;
};

export const ASSET_MANIFEST: AssetManifest = {
    // Textures
    textures: {
        // Example: "hero": "/assets/hero.png",
        // Example: "monster": "/assets/monster.png",
        "heroCard": "/assets/heroCard.png",
        "hero-bioform": "/assets/bioform.png",
        "hero-chrono": "/assets/chrono.png",
        "hero-forge": "/assets/forge.png",
        "hero-nomad": "/assets/nomad.png",
        "hero-void": "/assets/void.png",
        "hero-warbound": "/assets/warbound.png",
    } as Record<string, string>,
    
    // Spritesheets
    spritesheets: {
        // Example: "items": "/assets/items.json",
    } as Record<string, string>,
    
    // Audio (for future)
    audio: {
        // Example: "attack": "/assets/sounds/attack.mp3",
    } as Record<string, string>,
};

class AssetLoaderClass {
    private loaded = false;
    private textures: Map<string, PIXI.Texture> = new Map();
    private spritesheets: Map<string, PIXI.Spritesheet> = new Map();
    private manifest: AssetManifest = ASSET_MANIFEST;
    
    /**
     * Load all assets with progress callback
     */
    async loadAll(onProgress?: (progress: number) => void): Promise<void> {
        if (this.loaded) return;

        await this.loadManifest();

        const allAssets: { name: string; src: string; type: string }[] = [];
        
        // Collect all assets
        for (const [name, src] of Object.entries(this.manifest.textures)) {
            allAssets.push({ name, src, type: "texture" });
        }
        for (const [name, src] of Object.entries(this.manifest.spritesheets)) {
            allAssets.push({ name, src, type: "spritesheet" });
        }
        
        // If no assets, just return
        if (allAssets.length === 0) {
            onProgress?.(100);
            this.loaded = true;
            return;
        }
        
        // Load assets one by one
        let loadedCount = 0;
        console.log(`[AssetLoader] Loading ${allAssets.length} assets:`, allAssets.map(a => a.name));
        
        for (const asset of allAssets) {
            try {
                if (asset.type === "texture") {
                    console.log(`[AssetLoader] Loading texture: ${asset.name} from ${asset.src}`);
                    const texture = await PIXI.Assets.load(asset.src);
                    this.textures.set(asset.name, texture);
                    console.log(`[AssetLoader] Loaded texture: ${asset.name}`, texture ? "OK" : "FAILED");
                } else if (asset.type === "spritesheet") {
                    const sheet = await PIXI.Assets.load(asset.src);
                    this.spritesheets.set(asset.name, sheet);
                }
            } catch (e) {
                console.warn(`[AssetLoader] Failed to load asset: ${asset.name}`, e);
            }
            
            loadedCount++;
            onProgress?.(Math.round((loadedCount / allAssets.length) * 100));
        }
        
        console.log(`[AssetLoader] Finished loading. Textures available:`, Array.from(this.textures.keys()));
        this.loaded = true;
    }
    
    /**
     * Get a loaded texture by name
     */
    getTexture(name: string): PIXI.Texture | null {
        const texture = this.textures.get(name);
        if (!texture) {
            console.warn(`[AssetLoader] Texture not found: "${name}". Available:`, Array.from(this.textures.keys()));
        }
        return texture || null;
    }
    
    /**
     * Get a loaded spritesheet by name
     */
    getSpritesheet(name: string): PIXI.Spritesheet | null {
        return this.spritesheets.get(name) || null;
    }
    
    /**
     * Check if assets are loaded
     */
    isLoaded(): boolean {
        return this.loaded;
    }

    private async loadManifest(): Promise<void> {
        try {
            const response = await fetch(`/assets/manifest.json?${GAME_VERSION}`);
            if (!response.ok) {
                console.log("[AssetLoader] No manifest.json found, using built-in manifest");
                return;
            }
            const manifest = (await response.json()) as AssetManifest;
            // Merge with built-in manifest (external manifest takes priority)
            this.manifest = {
                textures: { ...ASSET_MANIFEST.textures, ...(manifest.textures ?? {}) },
                spritesheets: { ...ASSET_MANIFEST.spritesheets, ...(manifest.spritesheets ?? {}) },
                audio: { ...ASSET_MANIFEST.audio, ...(manifest.audio ?? {}) },
            };
            console.log("[AssetLoader] Loaded manifest with textures:", Object.keys(this.manifest.textures));
        } catch (error) {
            console.warn("[AssetLoader] Failed to load asset manifest, using defaults.", error);
        }
    }
}

export const AssetLoader = new AssetLoaderClass();
