import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import CreateEvent from './pages/events/CreateEvent'
import EventRegistration from './pages/events/EventRegistration'
import Participants from './pages/events/Participants'
import IDCardGenerator from './pages/events/IDCardGenerator'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/event/:slug" element={<EventRegistration />} />

        {/* Admin routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events/create" element={<CreateEvent />} />
        <Route path="/events/:id/participants" element={<Participants />} />
        <Route path="/events/:id/id-cards" element={<IDCardGenerator />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
