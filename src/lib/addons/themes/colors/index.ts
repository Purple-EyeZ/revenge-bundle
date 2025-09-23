
import patchChatBackground from "./patches/background";
import patchDefinitionAndResolver from "./patches/resolver";
import { ColorManifest } from "./types";
import { updateBunnyColor } from "./updater";

/** @internal */
export default function initColors(manifest: ColorManifest | null) {
    const patches = [
        patchDefinitionAndResolver(),
        patchChatBackground()
    ];

    if (manifest) updateBunnyColor(manifest);

    return () => patches.forEach(p => p());
}
