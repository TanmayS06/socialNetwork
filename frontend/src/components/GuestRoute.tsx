import { Navigate, Outlet } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "@/store/types"

const GuestRoute = () => {
  const { isLoggedIn, authChecked } = useSelector(
    (state: RootState) => state.auth
  )

  if (!authChecked) {
    return <div className="text-white">Loading...</div>
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default GuestRoute
