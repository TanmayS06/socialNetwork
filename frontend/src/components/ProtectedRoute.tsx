import { Navigate, Outlet } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "@/store/types"

const ProtectedRoute = () => {
  const { isLoggedIn, authChecked } = useSelector(
    (state: RootState) => state.auth
  )

  if (!authChecked) {
    return <div className="text-white">Loading...</div>
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}


export default ProtectedRoute
