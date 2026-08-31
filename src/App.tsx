import { AppShell } from './components/shell/AppShell.tsx';
import { WorkspaceHeader } from './components/workspace/WorkspaceHeader.tsx';
import { SpeedDialGrid } from './components/tiles/SpeedDialGrid.tsx';
import { CalendarPopover } from './components/calendar/CalendarPopover.tsx';
import { TileSettingsPanel } from './components/settings/TileSettingsPanel.tsx';
import { SectionContent } from './components/sections/SectionContent.tsx';
import { TileStyleBridge } from './state/TileStyleBridge.tsx';
import { useAppStore } from './state/useAppStore.ts';

function WorkspaceContent() {
  const section = useAppStore(state => state.section);
  if (section !== 'home') return <SectionContent/>;
  return <><WorkspaceHeader/><SpeedDialGrid/></>;
}

export default function App(){return <><TileStyleBridge/><AppShell><WorkspaceContent/></AppShell><CalendarPopover/><TileSettingsPanel/></>}
