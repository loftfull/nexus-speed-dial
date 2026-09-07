import { AppShell } from './components/shell/AppShell.tsx';
import { WorkspaceHeader } from './components/workspace/WorkspaceHeader.tsx';
import { SpeedDialGrid } from './components/tiles/SpeedDialGrid.tsx';
import { CalendarPopover } from './components/calendar/CalendarPopover.tsx';
import { WeatherPopover } from './components/weather/WeatherPopover.tsx';
import { TileSettingsPanel } from './components/settings/TileSettingsPanel.tsx';
import { SiteEditor } from './components/sites/SiteEditor.tsx';
import { StructureEditor } from './components/structure/StructureEditor.tsx';
import { TileStyleBridge } from './state/TileStyleBridge.tsx';

export default function App() {
  return <>
    <TileStyleBridge/>
    <AppShell>
      <WorkspaceHeader/>
      <SpeedDialGrid/>
    </AppShell>
    <CalendarPopover/>
    <WeatherPopover/>
    <TileSettingsPanel/>
    <StructureEditor/>
    <SiteEditor/>
  </>;
}
