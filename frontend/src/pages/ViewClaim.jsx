import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import expense from '../utils/demoexpense'
import {ChevronDown,ChevronUp} from 'lucide-react'
const ViewClaim = () => {
    const {id}=useParams()
    const [claim,setClaim]=useState(expense[0]);
    const [showItems,setShowItems]=useState(false);

    useEffect(()=>{
        //call backend to fetch the claim by id
    },[])


  return (
    <div className='flex max-md:flex-col gap-4 h-screen'>

        <section className='flex-1'>
            <img src={`http://localhost:8000/${claim.receipt_image_url}`} alt="receipt" className='w-full h-screen max-md:h-[50vh] object-contain'/>
        </section>

        <section className='flex-1 overflow-y-auto'>

            <div className='view-section'>
                <p className="headings">Merchant Name :</p>
                <p className="fake-input">{claim.extracted_data.vendor_name}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Total :</p>
                <p className="fake-input">{claim.extracted_data.total}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Currency :</p>
                <p className="fake-input">{claim.extracted_data.currency}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Date :</p>
                <p className="fake-input">{claim.extracted_data.date}</p>
            </div>

            <div className=''>
                <p className="headings inline-flex justify-between">Items <span onClick={()=>setShowItems(!showItems)} className='cursor-pointer'>{showItems?<ChevronDown/>:<ChevronUp/>}</span></p>
                <ul className={`mx-4 flex flex-col gap-2 ${showItems?'block':'hidden'}`}>
                    {claim.extracted_data.items.map((item,index)=>{
                        return (
                            <li key={index} className='flex justify-between'>
                                <div className='flex'>
                                    <p>Name :</p>
                                    <p>{item.name}</p>
                                </div>
                                
                                <div className='flex'>
                                  <p>Qty :</p>
                                  <p>{item.quantity}</p>

                                </div>

                                <div className='flex'>
                                  <p>Price :</p>
                                  <p>{item.price}</p>

                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className='view-section'>
                <p className="headings">Description :</p>
                <p className="fake-input">{claim.description}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Business Purpose :</p>
                <p className="fake-input">{claim.business_purpose}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Category :</p>
                <p className="fake-input">{claim.category}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Amount :</p>
                <p className="fake-input">{claim.amount}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Currency :</p>
                <p className="fake-input">{claim.currency}</p>
            </div>

            <div className='view-section'>
                <p className="headings">Expense Date :</p>
                <p className="fake-input">{claim.expense_date}</p>
            </div>
        </section>
    </div>
  )
}

export default ViewClaim