import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import OrganizationSettings from './pages/OrganizationSettings'
import Donations from './pages/Donations'

import Profile from './pages/Profile'
import AllParticipants from './pages/AllParticipants'
import CreateEvent from './pages/events/CreateEvent'
import EditEvent from './pages/events/EditEvent'
import EventRegistration from './pages/events/EventRegistration'
import Participants from './pages/events/Participants'

import PublicTicket from './pages/events/PublicTicket'
// Super Admin Pages
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard'
import Users from './pages/admin/Users'
import Organizations from './pages/admin/Organizations'
import LandingPageEditor from './pages/admin/LandingPageEditor'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/event/:slug" element={<EventRegistration />} />
        <Route path="/ticket/:registrationId" element={<PublicTicket />} />

        {/* Protected Admin routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/events/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
        <Route path="/events/:id/edit" element={<ProtectedRoute><EditEvent /></ProtectedRoute>} />
        <Route path="/events/:id/participants" element={<ProtectedRoute><Participants /></ProtectedRoute>} />

        <Route path="/participants" element={<ProtectedRoute><AllParticipants /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/organization" element={<ProtectedRoute><OrganizationSettings /></ProtectedRoute>} />
        <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />


        {/* Super Admin routes (requires super_admin role) */}
        <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/super-admin/users" element={<ProtectedRoute requiredRole="super_admin"><Users /></ProtectedRoute>} />
        <Route path="/super-admin/organizations" element={<ProtectedRoute requiredRole="super_admin"><Organizations /></ProtectedRoute>} />
        <Route path="/super-admin/landing" element={<ProtectedRoute requiredRole="super_admin"><LandingPageEditor /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
