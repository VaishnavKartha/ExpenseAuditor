import { ChevronDown, ChevronUp } from 'lucide-react'
import React from 'react'

const Filters = ({status,setStatus}) => {
  return (
    <div className='flex gap-12 m-4'>
        <div className='bg-gray-400/70 rounded-full p-2'>
            
            <select value={status} onChange={((e)=>setStatus(e.target.value))}>
                <option value="" disabled>Status</option>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </select>
        </div>

        <div className='flex bg-gray-400/70 rounded-full px-4 py-2'>
            <p>Date</p>
            <span className='size-2'><ChevronDown/></span>
            <span className='size-2'><ChevronUp/></span>
        </div>
    </div>
  )
}

export default Filters