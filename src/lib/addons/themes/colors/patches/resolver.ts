import { _colorRef } from "@lib/addons/themes/colors/updater";
import { before, instead } from "@lib/api/patcher";
import { findByProps } from "@metro";
import { byMutableProp } from "@metro/filters";
import { createLazyModule } from "@metro/lazy";
import chroma from "chroma-js";

const tokenReference = findByProps("SemanticColor");
const isThemeModule = createLazyModule(byMutableProp("isThemeDark"));

const SEMANTIC_FALLBACK_MAP: Record<string, string> = {
    "BG_BACKDROP": "BACKGROUND_FLOATING",
    "BG_BASE_PRIMARY": "BACKGROUND_PRIMARY",
    "BG_BASE_SECONDARY": "BACKGROUND_SECONDARY",
    "BG_BASE_TERTIARY": "BACKGROUND_SECONDARY_ALT",
    "BG_MOD_FAINT": "BACKGROUND_MODIFIER_ACCENT",
    "BG_MOD_STRONG": "BACKGROUND_MODIFIER_ACCENT",
    "BG_MOD_SUBTLE": "BACKGROUND_MODIFIER_ACCENT",
    "BG_SURFACE_OVERLAY": "BACKGROUND_FLOATING",
    "BG_SURFACE_OVERLAY_TMP": "BACKGROUND_FLOATING",
    "BG_SURFACE_RAISED": "BACKGROUND_MOBILE_PRIMARY"
};

export default function patchDefinitionAndResolver() {
    const callback = ([theme]: any[]) => theme === _colorRef.key ? [_colorRef.current!.reference] : void 0;

    Object.keys(tokenReference.RawColor).forEach(key => {
        Object.defineProperty(tokenReference.RawColor, key, {
            configurable: true,
            enumerable: true,
            get: () => {
                const ret = _colorRef.current?.raw[key];
                return ret || _colorRef.origRaw[key];
            }
        });
    });

    const unpatches = [
        before("isThemeDark", isThemeModule, callback),
        before("isThemeLight", isThemeModule, callback),
        instead("resolveSemanticColor", tokenReference.default.meta ?? tokenReference.default.internal, (args: any[], orig: any) => {
            const [requestedTheme, colorObj] = args;
            if (!_colorRef.current || !colorObj) return orig(...args);

            // @ts-ignore
            const propSymbol = colorObj[extractInfo._sym ??= Object.getOwnPropertySymbols(colorObj)[0]];
            const semanticName = propSymbol;

            let semanticDef = _colorRef.current.semantic[semanticName];
            if (!semanticDef && _colorRef.current.spec === 2 && semanticName in SEMANTIC_FALLBACK_MAP) {
                semanticDef = _colorRef.current.semantic[SEMANTIC_FALLBACK_MAP[semanticName]];
            }
            if (semanticDef?.value) {
                return chroma(semanticDef.value).alpha(semanticDef.opacity).hex();
            }

            const nativeColorDef = tokenReference.SemanticColor[semanticName]?.[requestedTheme];
            
            if (nativeColorDef?.raw) {
                const customRawValue = _colorRef.current.raw[nativeColorDef.raw];
                if (customRawValue) {
                    return nativeColorDef.opacity === 1
                        ? customRawValue
                        : chroma(customRawValue).alpha(nativeColorDef.opacity).hex();
                }
            }

            // Fallback to default
            return orig(...args);
        }),
        () => {
            // Not the actual module but.. yeah.
            Object.defineProperty(tokenReference, "RawColor", {
                configurable: true,
                writable: true,
                value: _colorRef.origRaw
            });
        }
    ];

    return () => unpatches.forEach(p => p());
}

function extractInfo(themeName: string, colorObj: any): [name: string, colorDef: any] {
    // @ts-ignore - assigning to extractInfo._sym
    const propName = colorObj[extractInfo._sym ??= Object.getOwnPropertySymbols(colorObj)[0]];
    const colorDef = tokenReference.SemanticColor[propName];

    return [propName, colorDef[themeName]];
}
