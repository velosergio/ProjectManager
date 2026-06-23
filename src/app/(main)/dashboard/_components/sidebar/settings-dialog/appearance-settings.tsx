"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type FontKey, fontOptions } from "@/lib/fonts/registry";
import type { ContentLayout, NavbarStyle, SidebarCollapsible, SidebarVariant } from "@/lib/preferences/layout";
import {
  applyContentLayout,
  applyFont,
  applyNavbarStyle,
  applySidebarCollapsible,
  applySidebarVariant,
} from "@/lib/preferences/layout-utils";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { THEME_PRESET_OPTIONS, type ThemeMode, type ThemePreset } from "@/lib/preferences/theme";
import { applyThemePreset } from "@/lib/preferences/theme-utils";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

/// Pestaña «Apariencia» del modal de Configuración: tema, fuente, modo, disposición
/// del contenido, comportamiento del navbar y estilo/colapso del sidebar.
export function AppearanceSettings() {
  const resolvedThemeMode = usePreferencesStore((s) => s.resolvedThemeMode);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);
  const contentLayout = usePreferencesStore((s) => s.contentLayout);
  const setContentLayout = usePreferencesStore((s) => s.setContentLayout);
  const navbarStyle = usePreferencesStore((s) => s.navbarStyle);
  const setNavbarStyle = usePreferencesStore((s) => s.setNavbarStyle);
  const variant = usePreferencesStore((s) => s.sidebarVariant);
  const setSidebarVariant = usePreferencesStore((s) => s.setSidebarVariant);
  const collapsible = usePreferencesStore((s) => s.sidebarCollapsible);
  const setSidebarCollapsible = usePreferencesStore((s) => s.setSidebarCollapsible);
  const font = usePreferencesStore((s) => s.font);
  const setFont = usePreferencesStore((s) => s.setFont);

  const onThemePresetChange = (preset: ThemePreset) => {
    applyThemePreset(preset);
    setThemePreset(preset);
    void persistPreference("theme_preset", preset);
  };

  const onThemeModeChange = (mode: ThemeMode | "") => {
    if (!mode) return;
    setThemeMode(mode);
    void persistPreference("theme_mode", mode);
  };

  const onContentLayoutChange = (layout: ContentLayout | "") => {
    if (!layout) return;
    applyContentLayout(layout);
    setContentLayout(layout);
    void persistPreference("content_layout", layout);
  };

  const onNavbarStyleChange = (style: NavbarStyle | "") => {
    if (!style) return;
    applyNavbarStyle(style);
    setNavbarStyle(style);
    void persistPreference("navbar_style", style);
  };

  const onSidebarStyleChange = (value: SidebarVariant | "") => {
    if (!value) return;
    setSidebarVariant(value);
    applySidebarVariant(value);
    void persistPreference("sidebar_variant", value);
  };

  const onSidebarCollapseModeChange = (value: SidebarCollapsible | "") => {
    if (!value) return;
    setSidebarCollapsible(value);
    applySidebarCollapsible(value);
    void persistPreference("sidebar_collapsible", value);
  };

  const onFontChange = (value: FontKey | "") => {
    if (!value) return;
    applyFont(value);
    setFont(value);
    void persistPreference("font", value);
  };

  const handleRestore = () => {
    onThemePresetChange(PREFERENCE_DEFAULTS.theme_preset);
    onThemeModeChange(PREFERENCE_DEFAULTS.theme_mode);
    onContentLayoutChange(PREFERENCE_DEFAULTS.content_layout);
    onNavbarStyleChange(PREFERENCE_DEFAULTS.navbar_style);
    onSidebarStyleChange(PREFERENCE_DEFAULTS.sidebar_variant);
    onSidebarCollapseModeChange(PREFERENCE_DEFAULTS.sidebar_collapsible);
    onFontChange(PREFERENCE_DEFAULTS.font);
  };

  return (
    <div className="flex flex-col gap-5 **:data-[slot=toggle-group]:w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs">
      <div className="space-y-1">
        <Label className="font-medium text-xs">Tema</Label>
        <Select value={themePreset} onValueChange={onThemePresetChange}>
          <SelectTrigger size="sm" className="w-full text-xs">
            <SelectValue placeholder="Tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {THEME_PRESET_OPTIONS.map((preset) => (
                <SelectItem key={preset.value} className="text-xs" value={preset.value}>
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        (resolvedThemeMode ?? "light") === "dark" ? preset.primary.dark : preset.primary.light,
                    }}
                  />
                  {preset.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="font-medium text-xs">Fuente</Label>
        <Select value={font} onValueChange={onFontChange}>
          <SelectTrigger size="sm" className="w-full text-xs">
            <SelectValue placeholder="Selecciona una fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {fontOptions.map((option) => (
                <SelectItem key={option.key} className="text-xs" value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-1">
        <Label className="font-medium text-xs">Modo de tema</Label>
        <ToggleGroup
          size="sm"
          spacing={0}
          variant="outline"
          type="single"
          value={themeMode}
          onValueChange={onThemeModeChange}
        >
          <ToggleGroupItem value="light" aria-label="Modo claro">
            Claro
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Modo oscuro">
            Oscuro
          </ToggleGroupItem>
          <ToggleGroupItem value="system" aria-label="Modo del sistema">
            Sistema
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <Label className="font-medium text-xs">Disposición de la página</Label>
        <ToggleGroup
          size="sm"
          spacing={0}
          variant="outline"
          type="single"
          value={contentLayout}
          onValueChange={onContentLayoutChange}
        >
          <ToggleGroupItem value="centered" aria-label="Disposición centrada">
            Centrada
          </ToggleGroupItem>
          <ToggleGroupItem value="full-width" aria-label="Disposición a todo el ancho">
            Todo el ancho
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

      <div className="space-y-1">
        <Label className="font-medium text-xs">Comportamiento del navbar</Label>
        <ToggleGroup
          size="sm"
          spacing={0}
          variant="outline"
          type="single"
          value={navbarStyle}
          onValueChange={onNavbarStyleChange}
        >
          <ToggleGroupItem value="sticky" aria-label="Navbar fijo">
            Fijo
          </ToggleGroupItem>
          <ToggleGroupItem value="scroll" aria-label="Navbar con desplazamiento">
            Con desplazamiento
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <Label className="font-medium text-xs">Estilo del sidebar</Label>
        <ToggleGroup
          size="sm"
          spacing={0}
          variant="outline"
          type="single"
          value={variant}
          onValueChange={onSidebarStyleChange}
        >
          <ToggleGroupItem value="inset" aria-label="Sidebar embebido">
            Embebido
          </ToggleGroupItem>
          <ToggleGroupItem value="sidebar" aria-label="Sidebar clásico">
            Clásico
          </ToggleGroupItem>
          <ToggleGroupItem value="floating" aria-label="Sidebar flotante">
            Flotante
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <Label className="font-medium text-xs">Modo de colapso del sidebar</Label>
        <ToggleGroup
          size="sm"
          spacing={0}
          variant="outline"
          type="single"
          value={collapsible}
          onValueChange={onSidebarCollapseModeChange}
        >
          <ToggleGroupItem value="icon" aria-label="Colapsar a iconos">
            Iconos
          </ToggleGroupItem>
          <ToggleGroupItem value="offcanvas" aria-label="Colapsar fuera del lienzo">
            Fuera del lienzo
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

      <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={handleRestore}>
        Restaurar valores por defecto
      </Button>
    </div>
  );
}
