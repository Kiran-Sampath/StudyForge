import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import './styles.css'

const router = createBrowserRouter([{ path: '*', element: <App /> }])
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AuthProvider><RouterProvider router={router} /></AuthProvider></React.StrictMode>,
)
