import { formatString, Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import ThemeCard from "@core/ui/settings/pages/Themes/ThemeCard";
import { useProxy } from "@core/vendetta/storage";
import { getCurrentTheme, installTheme, themes, VdThemeInfo } from "@lib/addons/themes";
import { colorsPref } from "@lib/addons/themes/colors/preferences";
import { updateBunnyColor } from "@lib/addons/themes/colors/updater";
import { Author } from "@lib/addons/types";
import { findAssetId } from "@lib/api/assets";
import { settings } from "@lib/api/settings";
import { useObservable } from "@lib/api/storage";
import { ActionSheet, BottomSheetTitleHeader, Button, TableCheckboxRow, TableRowGroup, TableRowIcon, TableSwitchRow, TableRow } from "@metro/common/components";
import { View } from "react-native";

export default function Themes() {
    useProxy(settings);
    useProxy(themes);

    return (
        <AddonPage<VdThemeInfo>
            title={Strings.THEMES}
            searchKeywords={[
                "data.name",
                "data.description",
                p => p.data.authors?.map((a: Author) => a.name).join(", ") ?? ""
            ]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.data.name.localeCompare(b.data.name),
                "Name (Z-A)": (a, b) => b.data.name.localeCompare(a.data.name)
            }}
            installAction={{
                label: "Install a theme",
                fetchFn: installTheme
            }}
            items={Object.values(themes)}
            safeModeHint={{
                message: formatString("SAFE_MODE_NOTICE_THEMES", { enabled: Boolean(settings.safeMode?.currentThemeId) }),
                footer: settings.safeMode?.currentThemeId && <Button
                    size="small"
                    text={Strings.DISABLE_THEME}
                    onPress={() => delete settings.safeMode?.currentThemeId}
                    style={{ marginTop: 8 }}
                />
            }}
            CardComponent={ThemeCard}
            OptionsActionSheetComponent={() => {
                useObservable([colorsPref]);
                useProxy(settings);

                const themeTypeOptions = [
                    { label: "Auto", value: undefined, icon: "RobotIcon" },
                    { label: "Dark", value: "dark" as const, icon: "ThemeDarkIcon" },
                    { label: "Light", value: "light" as const, icon: "ThemeLightIcon" },
                ];

                const handleTypeChange = (newType: "dark" | "light" | undefined) => {
                    colorsPref.type = newType;
                    getCurrentTheme()?.data && updateBunnyColor(getCurrentTheme()!.data!, { update: true });
                };

                return <ActionSheet>
                    <BottomSheetTitleHeader title="Options" />
                    <View style={{ paddingVertical: 20, gap: 12 }}>
                        <TableRowGroup title="Override Theme Type">
                            {themeTypeOptions.map(option => (
                                <TableCheckboxRow
                                    key={option.label}
                                    icon={<TableRowIcon source={findAssetId(option.icon)} />}
                                    label={option.label}
                                    checked={(colorsPref.type ?? undefined) === option.value}
                                    onPress={() => handleTypeChange(option.value)}
                                />
                            ))}
                        </TableRowGroup>

                        <TableRowGroup title="Settings">
                            <TableSwitchRow
                                label="Show Chat Background"
                                subLabel="Shows or hides the theme's background image in chat"
                                icon={<TableRow.Icon source={findAssetId("ImageIcon")} />}
                                value={colorsPref.customBackground !== "hidden"}
                                onValueChange={(value) => {
                                    colorsPref.customBackground = value ? null : "hidden";
                                }}
                            />
                            <TableSwitchRow
                                label="Auto Reload"
                                subLabel="Automatically restart the app when a new theme is applied"
                                icon={<TableRow.Icon source={findAssetId("RetryIcon")} />}
                                value={settings.autoReloadOnThemeChange ?? false}
                                onValueChange={(value) => {
                                    settings.autoReloadOnThemeChange = value;
                                }}
                            />
                        </TableRowGroup>
                    </View>
                </ActionSheet>;
            }}
        />
    );
}
