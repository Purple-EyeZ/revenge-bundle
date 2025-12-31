import { settings } from "@lib/api/settings";
import { findByProps, findByPropsLazy, findByStoreNameLazy } from "@metro";
import { FluxDispatcher } from "@metro/common";
import { showConfirmationAlert } from "@core/vendetta/alerts";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { Strings } from "@core/i18n";

import { parseColorManifest } from "./parser";
import { colorsPref } from "./preferences";
import { ColorManifest, InternalColorDefinition } from "./types";

const tokenRef = findByProps("SemanticColor");
const origRawColor = { ...tokenRef.RawColor };
const AppearanceManager = findByPropsLazy("updateTheme");
const ThemeStore = findByStoreNameLazy("ThemeStore");
const FormDivider = findByPropsLazy("DIVIDER_COLORS");

// Block `update: true` calls on startup to prevent a settings save race condition
// (e.g. dev mode being disabled each restart). It also prevents the prompt from appearing 
// on startup or an infinite boot loop.
let appIsReady = false;
const onReady = () => {
    appIsReady = true;
    FluxDispatcher.unsubscribe("POST_CONNECTION_OPEN", onReady);
};
FluxDispatcher.subscribe("POST_CONNECTION_OPEN", onReady);

let _inc = 1;

interface InternalColorRef {
    key: `bn-theme-${string}`;
    current: InternalColorDefinition | null;
    readonly origRaw: Record<string, string>;
    lastSetDiscordTheme: string;
}

/** @internal */
export const _colorRef: InternalColorRef = {
    current: null,
    key: `bn-theme-${_inc}`,
    origRaw: origRawColor,
    lastSetDiscordTheme: "darker"
};

export function updateBunnyColor(colorManifest: ColorManifest | null, { update = true }) {
    if (settings.safeMode?.enabled) return;

    const resolveType = (type = "dark") => (colorsPref.type ?? type) === "dark" ? "darker" : "light";
    const internalDef = colorManifest ? parseColorManifest(colorManifest) : null;
    const isLight = resolveType() === "light";

    const key = isLight ? `bn-theme-${++_inc}` : "dark";

    const ref = Object.assign(_colorRef, {
        current: internalDef,
        key: key,
        lastSetDiscordTheme: !ThemeStore.theme.startsWith("bn-theme-") && ThemeStore.theme !== "dark"
            ? ThemeStore.theme
            : _colorRef.lastSetDiscordTheme
    });

    if (internalDef) {
        tokenRef.Theme[key.toUpperCase()] = key;
        FormDivider.DIVIDER_COLORS[key] = FormDivider.DIVIDER_COLORS[internalDef.reference];

        Object.keys(tokenRef.Shadow).forEach(k => tokenRef.Shadow[k][key] = tokenRef.Shadow[k][internalDef.reference]);
        Object.keys(tokenRef.SemanticColor).forEach(k => {
            tokenRef.SemanticColor[k][key] = {
                ...tokenRef.SemanticColor[k][internalDef.reference]
            };
        });
    }

    if (update && appIsReady) {
        AppearanceManager.setShouldSyncAppearanceSettings(false);
        AppearanceManager.updateTheme(internalDef != null ? ref.key : "darker");

        if (internalDef) {
            if (settings.autoReloadOnThemeChange) {
                // Delay the reload slightly to ensure preferences have time to save.
                setTimeout(() => BundleUpdaterManager.reload(), 100);
                return;
            }

            showConfirmationAlert({
                title: Strings.MODAL_RELOAD_REQUIRED,
                content: Strings.MODAL_RELOAD_REQUIRED_DESC,
                confirmText: Strings.RELOAD,
                cancelText: Strings.CANCEL,
                onConfirm: () => BundleUpdaterManager.reload()
            });
        }
    }
}

