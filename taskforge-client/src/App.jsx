import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/routes/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Workspaces from '@/pages/Workspaces';
import WorkspaceBoards from '@/pages/WorkspaceBoards';
import Board from '@/pages/Board';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Workspaces />} />
            <Route path="/workspaces/:workspaceId" element={<WorkspaceBoards />} />
            <Route path="/boards/:boardId" element={<Board />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
