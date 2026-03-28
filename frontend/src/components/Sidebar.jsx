import React,{useEffect, useState} from 'react'
import {useLocation, useNavigate} from 'react-router'
import {House,Camera, LogOut, Menu,X} from 'lucide-react'

export default function Sidebar(){
    const [activePath,setActivePath]=useState(null)
    const [open,setOpen]=useState(false)
    const location = useLocation()
    
    const navigate=useNavigate()
    console.log(location.pathname)

    useEffect(()=>{

        setActivePath(location.pathname)

    },[location])

    return(
        <>
            <span onClick={()=>setOpen(!open)} className='sm:hidden cursor-pointer absolute bg-white z-10'><Menu/></span>

            {open && <div className="fixed inset-0 bg-black/30 z-10 sm:hidden" onClick={() => setOpen(false)} />}

            <div className={`sm:block lg:mr-4 absolute bg-white max-md:z-10 sm:relative px-4 h-screen w-16 md:w-56 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.1)] transition-transform ${open?"translate-x-0":"-translate-x-full sm:translate-x-0"}`}>

                <span onClick={()=>setOpen(!open)} className='sm:hidden cursor-pointer'><X/></span>
                <ul className="h-full flex flex-col justify-evenly items-center">


                    <li className={` ${activePath=="/" && "bg-primary text-white"} li-items  rounded-full`}
                    onClick={()=>{navigate("/");setOpen(false)}}
                    >
                        <span><House/></span>
                        <span className='hidden md:block'>Home</span>
                    </li>


                    <li className={`${activePath=="/createclaim" && "bg-primary text-white" } li-items rounded-full`}
                    onClick={()=>{navigate("/createclaim");setOpen(false)}}
                    >
                        <span><Camera/></span>
                        <span className='hidden md:block'>Create Claim</span>
                        
                    </li>



                    <li className="li-items">
                        <span><LogOut/></span>
                        <span className='hidden md:block'>Logout</span>
                    </li>
                </ul>


            </div>
        </>
    )
}