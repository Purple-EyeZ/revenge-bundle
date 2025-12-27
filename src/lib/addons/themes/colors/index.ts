
import patchChatBackground from "./patches/background";
import patchDefinitionAndResolver from "./patches/resolver";
import { ColorManifest } from "./types";
import { updateBunnyColor } from "./updater";

/** @internal */
export default function initColors(manifest: ColorManifest | null) {
    if (manifest) updateBunnyColor(manifest);
    
    const patches = [
        patchDefinitionAndResolver(),
        patchChatBackground()
    ];


    return () => patches.forEach(p => p());
}
