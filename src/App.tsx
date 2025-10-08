import { NavBar } from "./features/navbar/NavBar"
import { Content } from "./features/content/Content"
import { ScriptManager } from "./features/script-manager/ScriptManager"
import { useAppSelector } from "./app/hooks"
import { selectIsPanelOpen } from "./features/script-manager/scriptManagerSlice"

const App = () => {
  const isPanelOpen = useAppSelector(selectIsPanelOpen)

  return (
    <div className="app">
      <NavBar />
      <div className="app-layout">
        {isPanelOpen && (
          <div className="side-panel">
            <ScriptManager />
          </div>
        )}
        <div className={`main-content ${isPanelOpen ? 'with-panel' : ''}`}>
          <Content />
        </div>
      </div>
    </div>
  )
}

export default App
