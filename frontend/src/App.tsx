import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import AllParticipants from './pages/AllParticipants'
import CreateEvent from './pages/events/CreateEvent'
import EditEvent from './pages/events/EditEvent'
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
        <Route path="/events" element={<Events />} />
        <Route path="/events/create" element={<CreateEvent />} />
        <Route path="/events/:id/edit" element={<EditEvent />} />
        <Route path="/events/:id/participants" element={<Participants />} />
        <Route path="/events/:id/id-cards" element={<IDCardGenerator />} />
        <Route path="/participants" element={<AllParticipants />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
