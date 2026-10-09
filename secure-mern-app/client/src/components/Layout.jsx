import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

// The frame around every page: the navigation bar plus the page content.
function Layout() {
  return (
    <>
      <Navbar />
      <main className="container page">
        <Outlet />
      </main>
    </>
  )
}

export default Layout