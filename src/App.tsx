import { MindMapPage } from "./components/whiteboard/MindMapPage";

export default function App() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 text-white font-sans no-scroll-x">
      <MindMapPage />
    </div>
  );
}
