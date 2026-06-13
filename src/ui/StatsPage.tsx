import { StatsView } from './StatsView'

// Phone/tablet Stats tab. The solve list scrolls inside StatsView, so the page
// itself fills the available height without scrolling the whole shell.
export function StatsPage() {
  return (
    <div className="h-full w-full max-w-3xl mx-auto p-4 flex flex-col min-h-0">
      <StatsView />
    </div>
  )
}

export default StatsPage
