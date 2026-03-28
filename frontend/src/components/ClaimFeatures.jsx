import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {Clock9,Check,X,Flag} from 'lucide-react'
import Filters from './Filters'
const ClaimFeatures = ({claims=[],setClaims=()=>{}}) => {

    const navigate = useNavigate()
    //const [search,setSearch]=useState("")
    const[filters,setFilters]=useState({
        status:"all",
        date:"all",
        search:""
    })

    
    const status={"pending":<Clock9 className='size-4'/>,
        "approved":<Check className='size-4 text-green-600' />,
        "rejected":<X className='size-4 text-red-600'/>,
        "flagged":<Flag className='size-4 text-yellow-600'/>
    }

    const formatDate=(dateString)=>{
        const date= new Date(dateString)

        return date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
    }


   const filteredClaims = claims.filter((c) => {
  // Status filter
  const matchesStatus =
    filters.status === "all" || c.final_status === filters.status;

  // Search filter
  const matchesSearch =
    c.extracted_data.vendor_name
      .toLowerCase()
      .includes(filters.search.toLowerCase());

  return matchesStatus && matchesSearch;
});
  return (
    <div className='flex flex-col'>
        <div className='w-full mt-8 md:px-8'>
            <input className='w-full rounded-full px-2 py-4 outline-1 focus:outline-accent'
            placeholder='Search claims'
            value={filters.search}
            onChange={(e)=>setFilters({...filters,search:e.target.value})}
            />
        </div>

        <div><Filters status={filters.status} setStatus={(value)=>setFilters({...filters,status:value})}/></div>

        <div className=''>
            {filteredClaims.map((claim,index)=>{
                return (
                    <div key={index} onClick={()=>navigate(`/view/${claim._id}`)} className='max-md:text-[10px] flex justify-around cursor-pointer bg-accent/15 mt-4 px-2 py-4 hover:bg-accent/10'>
                        <img src={`http://localhost:8000/${claim.receipt_image_url}`} alt="receipt_image" className='w-10 h-10'/>

                        <div className='flex gap-4'>
                            <p>{formatDate(claim.extracted_data.date)}</p>
                            <h3 className='font-semibold'>{claim.extracted_data.vendor_name}</h3>
                        </div>

                        <div>
                            <span className='flex items-center'>{status[claim.final_status]}{claim.final_status}</span>
                            <p className='font-semibold'>{claim.extracted_data.total} {claim.extracted_data.currency}</p>
                        </div>



                    </div>
                )
            })}
        </div>
    </div>
  )
}

export default ClaimFeatures