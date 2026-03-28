import { Outlet } from "react-router"
import Sidebar from "./Sidebar"
export default function Layout(){


    return (
        <div className="flex h-screen">

            <Sidebar/>

            <div className="flex-1 overflow-y-auto">
                <Outlet/>
            </div>


        </div>
    )
}