import { lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import AppLayout from './layouts/AppLayout'
import ParcelLayout from './layouts/ParcelLayout'
import AlertDetailLayout from './layouts/AlertDetailLayout'
import Home from './pages/Home'

const Profile = lazy(() => import('./pages/Profile'))
const DemoStart = lazy(() => import('./pages/DemoStart'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Investigate = lazy(() => import('./pages/Investigate'))
const ParcelOverview = lazy(() => import('./pages/ParcelOverview'))
const OwnershipHistory = lazy(() => import('./pages/OwnershipHistory'))
const TransactionGraph = lazy(() => import('./pages/TransactionGraph'))
const TransactionTimeline = lazy(() => import('./pages/TransactionTimeline'))
const ParcelAlerts = lazy(() => import('./pages/ParcelAlerts'))
const Alerts = lazy(() => import('./pages/Alerts'))
const AlertEvidence = lazy(() => import('./pages/AlertEvidence'))
const RegistrationMutation = lazy(() => import('./pages/RegistrationMutation'))
const AiAnalysis = lazy(() => import('./pages/AiAnalysis'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Reports = lazy(() => import('./pages/Reports'))
const NotFound = lazy(() => import('./pages/NotFound'))
const DocumentVerification = lazy(() => import('./pages/DocumentVerification'))

function ProtectedApp() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="min-h-screen bg-slate-100" />
  return user ? <AppLayout /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedApp />}>
        <Route path="/demo" element={<DemoStart />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investigate" element={<Investigate />} />
        <Route path="/documents" element={<DocumentVerification />} />
        <Route path="/parcel/:parcelId" element={<ParcelLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<ParcelOverview />} />
          <Route path="ownership" element={<OwnershipHistory />} />
          <Route path="graph" element={<TransactionGraph />} />
          <Route path="timeline" element={<TransactionTimeline />} />
          <Route path="alerts" element={<ParcelAlerts />} />
        </Route>
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/alerts/:tid" element={<AlertDetailLayout />}>
          <Route index element={<AlertEvidence />} />
          <Route path="comparison" element={<RegistrationMutation />} />
          <Route path="ai" element={<AiAnalysis />} />
        </Route>
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
