/**
 * Asset Loader - Preloads game assets
 * 
 * Usage:
 *   await AssetLoader.loadAll((progress) => console.log(progress));
 *   const sprite = AssetLoader.getTexture("hero");
 */

import * as PIXI from "pixi.js";

export const GAME_VERSION = "v0.2";

// Asset manifest - add new assets here
const ASSET_MANIFEST = {
    // Textures
    textures: {
        // Example: "hero": "/assets/hero.png",
        // Example: "monster": "/assets/monster.png",
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
    
    /**
     * Load all assets with progress callback
     */
    async loadAll(onProgress?: (progress: number) => void): Promise<void> {
        if (this.loaded) return;
        
        const allAssets: { name: string; src: string; type: string }[] = [];
        
        // Collect all assets
        for (const [name, src] of Object.entries(ASSET_MANIFEST.textures)) {
            allAssets.push({ name, src, type: "texture" });
        }
        for (const [name, src] of Object.entries(ASSET_MANIFEST.spritesheets)) {
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
        for (const asset of allAssets) {
            try {
                if (asset.type === "texture") {
                    const texture = await PIXI.Assets.load(asset.src);
                    this.textures.set(asset.name, texture);
                } else if (asset.type === "spritesheet") {
                    const sheet = await PIXI.Assets.load(asset.src);
                    this.spritesheets.set(asset.name, sheet);
                }
            } catch (e) {
                console.warn(`Failed to load asset: ${asset.name}`, e);
            }
            
            loadedCount++;
            onProgress?.(Math.round((loadedCount / allAssets.length) * 100));
        }
        
        this.loaded = true;
    }
    
    /**
     * Get a loaded texture by name
     */
    getTexture(name: string): PIXI.Texture | null {
        return this.textures.get(name) || null;
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
}

export const AssetLoader = new AssetLoaderClass();
