import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from './pages/SignIn/SignIn';
import SignUp from './pages/SignUp/SignUp';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import NewPassword from './pages/NewPassword/NewPassword';
import Profile from './pages/Profile/Profile';
import EditMenu from "./pages/EditMenu/EditMenu.jsx";
import Chat from "./pages/Chat/Chat.jsx";
import MessageListener from "./components/MessageNotification/MessageListener.jsx";
import './App.css'

function App() {
  return (
    <>
      <BrowserRouter>
        <MessageListener />
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/new-password" element={<NewPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/menu/edit" element={<EditMenu />} />
          <Route path="*" element={<h1>404 - Page Not Found</h1>} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App