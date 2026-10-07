import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Welcome from './pages/Welcome';
import Verify from './pages/Verify';
import Home from './pages/Home';
import Login from './pages/Login';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import About from './pages/About';
import LearnHub from './pages/learn/LearnHub';
import WhatYouNeed from './pages/learn/WhatYouNeed';
import HowItWorksLearn from './pages/learn/HowItWorks';
import StatusGuide from './pages/learn/StatusGuide';
import Glossary from './pages/learn/Glossary';
import Faq from './pages/learn/Faq';
import Register from './pages/Register';
import Profile from './pages/Profile';
import StudentDashboard from './pages/StudentDashboard';
import ApplyLoan from './pages/ApplyLoan';
import MyLoans from './pages/MyLoans';
import LoanDetail from './pages/LoanDetail';
import Payments from './pages/Payments';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApplications from './pages/admin/AdminApplications';
import AdminRates from './pages/admin/AdminRates';
import AdminVerifications from './pages/admin/AdminVerifications';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/learn" element={<LearnHub />} />
          <Route path="/learn/what-you-need" element={<WhatYouNeed />} />
          <Route path="/learn/how-it-works" element={<HowItWorksLearn />} />
          <Route path="/learn/status" element={<StatusGuide />} />
          <Route path="/learn/glossary" element={<Glossary />} />
          <Route path="/learn/faq" element={<Faq />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify"
            element={
              <ProtectedRoute>
                <Verify />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <WelcomeGate>
                  <DashboardHome />
                </WelcomeGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute>
                <ApplyLoan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans"
            element={
              <ProtectedRoute>
                <MyLoans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans/:id"
            element={
              <ProtectedRoute>
                <LoanDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute adminOnly>
                <WelcomeGate>
                  <AdminApplications />
                </WelcomeGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verifications"
            element={
              <ProtectedRoute adminOnly>
                <AdminVerifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rates"
            element={
              <ProtectedRoute adminOnly>
                <AdminRates />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminDashboard />;
  return <StudentDashboard />;
}

function WelcomeGate({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  const pending = sessionStorage.getItem('sl_welcome_pending') === '1';
  if (user.role === 'student' && pending) return <Navigate to="/welcome" replace />;
  if (user.role === 'admin' && pending && !user.welcome_seen_at) {
    return <Navigate to="/welcome" replace />;
  }
  return children;
}