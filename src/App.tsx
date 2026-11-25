import { AppProvider, useApp } from "@/state/store";
import { TourProvider } from "@/components/tour/Tour";
import { Shell } from "@/components/layout/Shell";
import { ChannelPanel } from "@/components/shared";
import { Overview } from "@/screens/Overview";
import { DataSources } from "@/screens/DataSources";
import { SalesModel } from "@/screens/SalesModel";
import { DataQuality } from "@/screens/DataQuality";
import { Reconciliation } from "@/screens/Reconciliation";
import { WeeklyReports } from "@/screens/WeeklyReports";
import { Help, Settings } from "@/screens/SettingsHelp";

function Screen() {
  const { route } = useApp();
  switch (route) {
    case "sources": return <DataSources />;
    case "model": return <SalesModel />;
    case "quality": return <DataQuality />;
    case "reconciliation": return <Reconciliation />;
    case "reports": return <WeeklyReports />;
    case "settings": return <Settings />;
    case "help": return <Help />;
    default: return <Overview />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <TourProvider>
        <Shell><Screen /></Shell>
        <ChannelPanel />
      </TourProvider>
    </AppProvider>
  );
}
